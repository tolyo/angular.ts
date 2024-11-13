import { createInjector } from "../../core/di/injector";
import { isObject } from "../../shared/utils";
import { Angular } from "../../loader";

export function getLastAjaxRequest() {
  let ajaxEntries = performance
    .getEntriesByType("resource")
    .filter((entry) => entry.initiatorType === "xmlhttprequest");
  return ajaxEntries[ajaxEntries.length - 1];
}

describe("$http", function () {
  let $http, $injector, $httpBackend, requests, response, $rootScope, $q;

  beforeEach(function () {
    window.angular = new Angular();
    requests = [];
    $injector = createInjector(["ng"]);
    $http = $injector.get("$http");
    $httpBackend = $injector.get("$httpBackend");
    $rootScope = $injector.get("$rootScope");
  });

  it("is a function", function () {
    expect($http instanceof Function).toBe(true);
  });

  it("returns a Promise", function () {
    const result = $http({ url: "test" });
    expect(result).toBeDefined();
    expect(result.then).toBeDefined();
  });

  it("makes an XMLHttpRequest to given URL", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "hello",
    }).then((res) => {
      requests.push(res);
    });
    expect(requests.length).toBe(1);
    expect(requests[0].config.method).toBe("POST");
    expect(requests[0].config.url).toBe("/mock/hello");
    expect(requests[0].config.data).toBe("hello");
  });

  it("resolves promise when XHR result received", async function () {
    await $http({
      method: "GET",
      url: "/mock/hello",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("OK");
    expect(response.data).toBe("Hello");
    expect(response.config.url).toEqual("/mock/hello");
  });

  it("rejects promise when XHR result received with error status", async function () {
    await $http({
      method: "GET",
      url: "/mock/401",
    }).catch(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.status).toBe(401);
    expect(response.statusText).toBe("Unauthorized");
    expect(response.data).toBe("Unauthorized");
    expect(response.config.url).toEqual("/mock/401");
  });

  it("uses GET method by default", async function () {
    await $http({
      url: "/mock/hello",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.method).toBe("GET");
  });

  it("sets deffault headers on request", async function () {
    await $http({
      url: "/mock/hello",
      headers: {
        Accept: "text/plain",
        "Cache-Control": "no-cache",
      },
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();

    expect(response.config.headers.Accept).toBe(
      "application/json, text/plain, */*",
    );
    expect(response.config.headers["Cache-Control"]).toBe("no-cache");
  });

  it("sets method-specific default headers on POST request", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("sets method-specific default headers on PUT request", async function () {
    await $http({
      method: "PUT",
      url: "/mock/put",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("sets method-specific default headers on PATCH request", async function () {
    await $http({
      method: "PATCH",
      url: "/mock/patch",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
  });

  it("exposes default headers for overriding", async function () {
    $http.defaults.headers.post.Accept = "text/plain";
    $http.defaults.headers.post["Content-Type"] = "text/plain;charset=utf-8";
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "42",
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Accept"]).toBe("text/plain");
    expect(response.config.headers["Content-Type"]).toBe(
      "text/plain;charset=utf-8",
    );
  });

  it("merges default headers case-insensitively", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: "42",
      headers: {
        "content-type": "text/plain;charset=utf-8",
      },
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();

    expect(response.config.headers["content-type"]).toBe(
      "text/plain;charset=utf-8",
    );
    expect(response.config.headers["Content-Type"]).toBeUndefined();
  });

  it("does not send content-type header when no data", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
    }).then(function (r) {
      response = r;
    });
    expect(response).toBeDefined();
    expect(response.config.headers["Content-Type"]).not.toBe(
      "application/json;charset=utf-8",
    );
  });

  it("supports functions as header values", async function () {
    const contentTypeSpy = jasmine
      .createSpy()
      .and.returnValue("text/plain;charset=utf-8");
    $http.defaults.headers.post["Content-Type"] = contentTypeSpy;
    const request = {
      method: "POST",
      url: "/mock/hello",
      data: 42,
    };
    await $http(request).then(function (r) {
      response = r;
    });
    expect(contentTypeSpy).toHaveBeenCalledWith(request);
    expect(response.config.headers["Content-Type"]).toBe(
      "text/plain;charset=utf-8",
    );
  });

  it("ignores header function value when null/undefined", async function () {
    const cacheControlSpy = jasmine.createSpy().and.returnValue(null);
    $http.defaults.headers.post["Cache-Control"] = cacheControlSpy;
    const request = {
      method: "POST",
      url: "/mock/hello",
      data: 42,
    };
    await $http(request).then(function (r) {
      response = r;
    });
    expect(cacheControlSpy).toHaveBeenCalledWith(request);
    expect(response.config.headers["Cache-Control"]).toBeUndefined();
  });

  it("makes response headers available", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    }).then(function (r) {
      response = r;
    });
    expect(response.headers).toBeDefined();
    expect(response.headers instanceof Function).toBe(true);
    expect(response.headers("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers("content-type")).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("may returns all response headers", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    }).then(function (r) {
      response = r;
    });
    expect(response.headers()).toBeTruthy();
  });

  it("allows setting withCredentials", async function () {
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      withCredentials: true,
    }).then(function (r) {
      response = r;
    });
    expect(response.config.withCredentials).toBe(true);
  });

  it("allows setting withCredentials from defaults", async function () {
    $http.defaults.withCredentials = true;
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    }).then(function (r) {
      response = r;
    });
    expect(response.config.withCredentials).toBe(true);
  });

  it("allows transforming requests with functions", async function () {
    let transformedData;
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      transformRequest: function (data) {
        transformedData = "*" + data + "*";
        return transformedData;
      },
    }).then(function (r) {
      response = r;
    });
    expect(transformedData).toBe("*42*");
  });

  it("allows multiple request transform functions", async function () {
    let transformedData;
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      transformRequest: [
        function (data) {
          transformedData = "*" + data + "*";
          return transformedData;
        },
        function (data) {
          transformedData = "-" + data + "-";
          return transformedData;
        },
      ],
    });
    expect(transformedData).toBe("-*42*-");
  });

  it("allows settings transforms in defaults", async function () {
    let transformedData;
    $http.defaults.transformRequest = [
      function (data) {
        transformedData = "*" + data + "*";
        return transformedData;
      },
    ];
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
    });
    expect(transformedData).toBe("*42*");
  });

  it("passes request headers getter to transforms", async function () {
    let transformedData;
    $http.defaults.transformRequest = [
      function (data, headers) {
        if (headers("Content-Type") === "text/emphasized") {
          transformedData = "*" + data + "*";
          return transformedData;
        } else {
          return data;
        }
      },
    ];
    await $http({
      method: "POST",
      url: "/mock/hello",
      data: 42,
      headers: {
        "content-type": "text/emphasized",
      },
    });
    expect(transformedData).toBe("*42*");
  });

  it("allows transforming responses with functions", async function () {
    await $http({
      url: "/mock/hello",
      transformResponse: function (data) {
        return "*" + data + "*";
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Hello*");
  });

  it("passes response headers to transform functions", async function () {
    await $http({
      url: "/mock/hello",
      transformResponse: function (data) {
        return "*" + data + "*";
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Hello*");
  });

  it("allows setting default response transforms", async function () {
    $http.defaults.transformResponse = [
      function (data) {
        return "*" + data + "*";
      },
    ];
    await $http({
      url: "/mock/hello",
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Hello*");
  });

  it("transforms error responses also", async function () {
    await $http({
      url: "/mock/401",
      transformResponse: function (data) {
        return "*" + data + "*";
      },
    }).catch(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("*Unauthorized*");
  });

  it("passes HTTP status to response transformers", async function () {
    let response;
    await $http({
      url: "/mock/401",
      transformResponse: function (data, headers, status) {
        if (status === 401) {
          return "unauthorized";
        } else {
          return data;
        }
      },
    }).catch(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("unauthorized");
  });

  it("serializes object data to JSON for requests", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      data: { aKey: 42 },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(response.data).toEqual({ aKey: 42 });
    expect(response.config.data).toEqual({ aKey: 42 });
  });

  it("serializes array data to JSON for requests", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      data: [1, "two", 3],
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(response.data).toEqual([1, "two", 3]);
  });

  it("does not serialize blobs for requests", async function () {
    let blob;
    if (window.Blob) {
      blob = new Blob(["hello"]);
    } else {
      const BlobBuilder =
        window.BlobBuilder ||
        window.WebKitBlobBuilder ||
        window.MozBlobBuilder ||
        window.MSBlobBuilder;
      const bb = new BlobBuilder();
      bb.append("hello");
      blob = bb.getBlob("text/plain");
    }
    await $http({
      method: "POST",
      url: "/mock/blob",
      data: blob,
    }).then(function (r) {
      response = r;
    });

    await wait();

    expect(response.config.data.size).toEqual(5);
    expect(response.data).toEqual("");
  });

  it("does not serialize form data for requests", async function () {
    const formData = new FormData();
    formData.append("aField", "aValue");
    await $http({
      method: "POST",
      url: "/mock/form",
      data: formData,
    }).then(function (r) {
      response = r;
    });

    await wait();

    expect(response.config.data).toEqual(formData);
    expect(response.data).toEqual("");
  });

  it("parses JSON data for JSON responses", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      data: { aKey: 42 },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(isObject(response.data)).toBe(true);
    expect(response.data.aKey).toBe(42);
  });

  it("parses a JSON object response without content type", async function () {
    await $http({
      method: "POST",
      url: "/mock/nocontent",
      data: { aKey: 42 },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(isObject(response.data)).toBe(true);
    expect(response.data.aKey).toBe(42);
  });

  it("parses a JSON array response without content type", async function () {
    await $http({
      method: "POST",
      url: "/mock/nocontent",
      data: [1, 2, 3],
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data).toEqual([1, 2, 3]);
  });

  it("does not choke on response resembling JSON but not valid", async function () {
    let response;
    await $http({
      method: "POST",
      url: "/mock/invalidarray",
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(response.data).toEqual("{1, 2, 3]");
  });

  it("does not try to parse interpolation expr as JSON", async function () {
    let response;
    await $http({
      method: "GET",
      url: "/mock/interpolation",
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(response.data).toEqual("{{expr}}");
  });

  it("adds params to URL", async function () {
    await $http({
      method: "GET",
      url: "/mock/hello",
      params: {
        a: 42,
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith("a=42"),
    ).toBeTrue();
  });

  it("adds additional params to URL", async function () {
    await $http({
      url: "/mock/hello?a=42",
      params: {
        b: 42,
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith("b=42"),
    ).toBeTrue();
  });

  it("escapes url characters in params", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        "==": "&&",
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("%3D%3D=%26%26"),
    ).toBeTrue();
  });

  it("does not attach null or undefined params", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: null,
        b: undefined,
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith(""),
    ).toBeTrue();
  });

  it("attaches multiple params from arrays", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: [42, 43],
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42&a=43"),
    ).toBeTrue();
  });

  it("serializes objects to json", async function () {
    await $http({
      method: "POST",
      url: "/mock/post",
      params: {
        a: { b: 42 },
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=%7B%22b%22:42%7D"),
    ).toBeTrue();
  });

  it("serializes dates to ISO strings", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: new Date(2015, 0, 1, 12, 0, 0),
      },
    }).then(function (r) {
      response = r;
    });
    await wait();
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("00:00.000Z"),
    ).toBeTrue();
  });

  it("allows substituting param serializer", async function () {
    await $http({
      url: "/mock/hello",
      params: {
        a: 42,
        b: 43,
      },
      paramSerializer: function (params) {
        return Object.keys(params)
          .map(function (k) {
            return k + "=" + params[k] + "lol";
          })
          .join("&");
      },
    }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42lol&b=43lol"),
    ).toBeTrue();
  });

  it("allows substituting param serializer through DI", async function () {
    const injector = createInjector([
      "ng",
      function ($provide) {
        $provide.factory("mySpecialSerializer", function () {
          return function (params) {
            return Object.keys(params)
              .map(function (k) {
                return k + "=" + params[k] + "lol";
              })
              .join("&");
          };
        });
      },
    ]);

    await injector.invoke(async function ($http, $rootScope) {
      await $http({
        url: "/mock/hello",
        params: {
          a: 42,
          b: 43,
        },
        paramSerializer: "mySpecialSerializer",
      }).then(function (r) {
        response = r;
      });
      await wait();
    });
    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("a=42lol&b=43lol"),
    ).toBeTrue();
  });

  it("makes default param serializer available through DI", async function () {
    const injector = createInjector(["ng"]);
    injector.invoke(function ($httpParamSerializer) {
      const result = $httpParamSerializer({ a: 42, b: 43 });
      expect(result).toEqual("a=42&b=43");
    });
  });

  it("supports shorthand method for GET", async function () {
    await $http
      .get("/mock/hello", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("GET");
  });

  it("supports shorthand method for HEAD", async function () {
    await $http
      .head("/mock/head", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("HEAD");
  });

  it("supports shorthand method for DELETE", async function () {
    await $http
      .delete("/mock/delete", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });

    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("DELETE");
  });

  it("supports shorthand method for POST with data", async function () {
    await $http
      .post("/mock/hello", "data", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("POST");
    expect(response.config.data).toBe("data");
  });

  it("supports shorthand method for PUT with data", async function () {
    await $http
      .put("/mock/put", "data", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();
    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("PUT");
    expect(response.config.data).toBe("data");
  });

  it("supports shorthand method for PATCH with data", async function () {
    await $http
      .patch("/mock/patch", "data", {
        params: { q: 42 },
      })
      .then(function (r) {
        response = r;
      });
    await wait();

    expect(
      response.config.paramSerializer(response.config.params).endsWith("q=42"),
    ).toBeTrue();
    expect(response.config.method).toBe("PATCH");
    expect(response.config.data).toBe("data");
  });

  it("allows attaching interceptor factories", async function () {
    const interceptorFactorySpy = jasmine.createSpy();
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(interceptorFactorySpy);
      },
    ]);
    $http = injector.get("$http");

    expect(interceptorFactorySpy).toHaveBeenCalled();
  });

  it("uses DI to instantiate interceptors", async function () {
    const interceptorFactorySpy = jasmine.createSpy();
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(["$rootScope", interceptorFactorySpy]);
      },
    ]);
    $http = injector.get("$http");
    const $rootScope = injector.get("$rootScope");

    expect(interceptorFactorySpy).toHaveBeenCalledWith($rootScope);
  });

  it("allows referencing existing interceptor factories", async function () {
    const interceptorFactorySpy = jasmine.createSpy().and.returnValue({});
    const injector = createInjector([
      "ng",
      function ($provide, $httpProvider) {
        $provide.factory("myInterceptor", interceptorFactorySpy);
        $httpProvider.interceptors.push("myInterceptor");
      },
    ]);
    $http = injector.get("$http");

    expect(interceptorFactorySpy).toHaveBeenCalled();
  });

  it("allows intercepting requests", async function () {
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(function () {
          return {
            request: function (config) {
              config.params.intercepted = true;
              return config;
            },
          };
        });
      },
    ]);
    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    await $http.get("/mock/hello", { params: {} }).then(function (r) {
      response = r;
    });

    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("intercepted=true"),
    ).toBeTrue();
  });

  it("allows returning promises from request intercepts", async function () {
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(function ($q) {
          return {
            request: function (config) {
              config.params.intercepted = true;
              return $q.resolve(config);
            },
          };
        });
      },
    ]);
    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    await $http.get("/mock/hello", { params: {} }).then(function (r) {
      response = r;
    });
    await wait();

    expect(
      response.config
        .paramSerializer(response.config.params)
        .endsWith("intercepted=true"),
    ).toBeTrue();
  });

  it("allows intercepting responses", async function () {
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(() => ({
          response: function (response) {
            response.intercepted = true;
            return response;
          },
        }));
      },
    ]);
    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    let response;
    await $http.get("/mock/hello").then(function (r) {
      response = r;
    });
    await wait();

    expect(response.intercepted).toBe(true);
  });

  it("allows intercepting request errors", async function () {
    const requestErrorSpy = jasmine.createSpy();
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(() => ({
          request: function (config) {
            throw "fail";
          },
        }));
        $httpProvider.interceptors.push(() => {
          return {
            requestError: requestErrorSpy,
          };
        });
      },
    ]);
    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    try {
      await $http.get("/mock/hello").then(function (r) {
        response = r;
      });
    } catch {}

    expect(requestErrorSpy).toHaveBeenCalledWith("fail");
  });

  it("allows intercepting response errors", async function () {
    const responseErrorSpy = jasmine.createSpy();
    const injector = createInjector([
      "ng",
      function ($httpProvider) {
        $httpProvider.interceptors.push(() => ({
          responseError: responseErrorSpy,
        }));
        $httpProvider.interceptors.push(() => ({
          response: function () {
            throw "fail";
          },
        }));
      },
    ]);
    $http = injector.get("$http");
    $rootScope = injector.get("$rootScope");

    await $http.get("/mock/hello");
    await wait();
    await wait();

    expect(responseErrorSpy).toHaveBeenCalledWith("fail");
  });

  it("allows attaching success handlers", async function () {
    let data, status, config;
    await $http.get("/mock/hello").then(function (res) {
      data = res.data;
      status = res.status;
      config = res.config;
    });
    await wait();

    expect(data).toBe("Hello");
    expect(status).toBe(200);
    expect(config.method).toBe("GET");
  });

  it("allows attaching error handlers", async function () {
    let res;
    await $http.get("/mock/401").then(
      () => {},
      function (r) {
        res = r;
      },
    );
    await wait();

    expect(res.data).toBe("Unauthorized");
    expect(res.status).toBe(401);
    expect(res.config.method).toBe("GET");
  });

  it("allows aborting a request with a Promise", async function () {
    const timeout = $q.defer();
    $http
      .get("/mock/never", {
        timeout: timeout.promise,
      })
      .then(
        function () {},
        function (err) {
          response = err;
        },
      );
    timeout.resolve();
    await wait();
    expect(response.xhrStatus).toBe("abort");
  });

  it("allows aborting a request after a timeout", async function () {
    await $http
      .get("/mock/never", {
        timeout: 50,
      })
      .then(
        function () {},
        function (err) {
          response = err;
        },
      );
    await wait();

    expect(response.xhrStatus).toBe("timeout");
  });

  describe("pending requests", function () {
    it("are in the collection while pending", async function (done) {
      $http.get("/mock/hello");
      expect($http.pendingRequests.length).toBe(0);
      await wait();
      expect($http.pendingRequests).toBeDefined();
      expect($http.pendingRequests.length).toBe(1);
      expect($http.pendingRequests[0].url).toBe("/mock/hello");
    });

    it("are also cleared on failure", async function () {
      await $http.get("/mock/401").then(
        () => {},
        (err) => {},
      );

      await wait();

      expect($http.pendingRequests.length).toBe(0);
    });
  });

  describe("useApplyAsync", function () {
    beforeEach(function () {
      const injector = createInjector([
        "ng",
        function ($httpProvider) {
          $httpProvider.useApplyAsync(true);
        },
      ]);
      $http = injector.get("$http");
      $rootScope = injector.get("$rootScope");
    });

    it("does not resolve promise immediately when enabled", async function () {
      const resolvedSpy = jasmine.createSpy();
      $http.get("/mock/hello").then(resolvedSpy);
      await wait();

      expect(resolvedSpy).not.toHaveBeenCalled();
    });

    it("resolves promise later when enabled", async function () {
      const resolvedSpy = jasmine.createSpy();
      await $http.get("/mock/hello").then(resolvedSpy);
      await wait();

      expect(resolvedSpy).toHaveBeenCalled();
    });
  });
});

// describe("$http", () => {
//   let callback;
//   let mockedCookies;
//   const customParamSerializer = function (params) {
//     return Object.keys(params).join("_");
//   };

//   beforeEach(
//     module(() => {
//       callback = jasmine.createSpy("done");
//       mockedCookies = {};
//     }),
//   );

//   beforeEach(
//     module({
//       $$cookieReader() {
//         return mockedCookies;
//       },
//       customParamSerializer,
//     }),
//   );

//   afterEach(inject(($exceptionHandler, $httpBackend, $rootScope) => {
//     forEach($exceptionHandler.errors, (e) => {
//       dump("Unhandled exception: ", e);
//     });

//     if ($exceptionHandler.errors.length) {
//       throw "Unhandled exceptions trapped in $exceptionHandler!";
//     }

//     $httpBackend.verifyNoOutstandingExpectation();
//   }));

//   describe("$httpProvider", () => {
//     describe("interceptors", () => {
//       it("should chain request, requestReject, response and responseReject interceptors", () => {
//         module(($httpProvider) => {
//           let savedConfig;
//           let savedResponse;
//           $httpProvider.interceptors.push(($q) => ({
//             request(config) {
//               config.url += "/1";
//               savedConfig = config;
//               return $q.reject("/2");
//             },
//           }));
//           $httpProvider.interceptors.push(($q) => ({
//             requestError(error) {
//               savedConfig.url += error;
//               return $q.resolve(savedConfig);
//             },
//           }));
//           $httpProvider.interceptors.push(() => ({
//             responseError(rejection) {
//               savedResponse.data += rejection;
//               return savedResponse;
//             },
//           }));
//           $httpProvider.interceptors.push(($q) => ({
//             response(response) {
//               response.data += ":1";
//               savedResponse = response;
//               return $q.reject(":2");
//             },
//           }));
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           let response;
//           $httpBackend.expect("GET", "/url/1/2").respond("response");
//           await $http({ method: "GET", url: "/url" }).then((r) => {
//             response = r;
//           });
//           await wait();
//           $httpBackend.flush();
//           expect(response.data).toEqual("response:1:2");
//         });
//       });

//       it("should verify order of execution", () => {
//         module(($httpProvider) => {
//           $httpProvider.interceptors.push(($q) => ({
//             request(config) {
//               config.url += "/outer";
//               return config;
//             },
//             response(response) {
//               response.data = `{${response.data}} outer`;
//               return response;
//             },
//           }));
//           $httpProvider.interceptors.push(($q) => ({
//             request(config) {
//               config.url += "/inner";
//               return config;
//             },
//             response(response) {
//               response.data = `{${response.data}} inner`;
//               return response;
//             },
//           }));
//         });
//         inject(($http, $httpBackend) => {
//           let response;
//           $httpBackend.expect("GET", "/url/outer/inner").respond("response");
//           await $http({ method: "GET", url: "/url" }).then((r) => {
//             response = r;
//           });
//           $httpBackend.flush();
//           expect(response.data).toEqual("{{response} inner} outer");
//         });
//       });
//     });

//     describe("request interceptors", () => {
//       it("should pass request config as a promise", () => {
//         let run = false;
//         module(($httpProvider) => {
//           $httpProvider.interceptors.push(() => ({
//             request(config) {
//               expect(config.url).toEqual("/url");
//               expect(config.data).toEqual({ one: "two" });
//               expect(config.headers.foo).toEqual("bar");
//               run = true;
//               return config;
//             },
//           }));
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           $httpBackend.expect("POST", "/url").respond("");
//           await $http({
//             method: "POST",
//             url: "/url",
//             data: { one: "two" },
//             headers: { foo: "bar" },
//           });
//           await wait();
//           expect(run).toEqual(true);
//         });
//       });

//       it("should allow manipulation of request", () => {
//         module(($httpProvider) => {
//           $httpProvider.interceptors.push(() => ({
//             request(config) {
//               config.url = "/intercepted";
//               config.headers.foo = "intercepted";
//               return config;
//             },
//           }));
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           $httpBackend
//             .expect(
//               "GET",
//               "/intercepted",
//               null,
//               (headers) => headers.foo === "intercepted",
//             )
//             .respond("");
//           $http.get("/url");
//           await wait();
//         });
//       });

//       it("should allow replacement of the headers object", () => {
//         module(($httpProvider) => {
//           $httpProvider.interceptors.push(() => ({
//             request(config) {
//               config.headers = { foo: "intercepted" };
//               return config;
//             },
//           }));
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           $httpBackend
//             .expect("GET", "/url", null, (headers) =>
//               angular.equals(headers, { foo: "intercepted" }),
//             )
//             .respond("");
//           $http.get("/url");
//           await wait();
//         });
//       });

//       it("should reject the http promise if an interceptor fails", () => {
//         const reason = new Error("interceptor failed");
//         module(($httpProvider) => {
//           $httpProvider.interceptors.push(($q) => ({
//             request(promise) {
//               return $q.reject(reason);
//             },
//           }));
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           const success = jasmine.createSpy();
//           const error = jasmine.createSpy();
//           $http.get("/url").then(success, error);
//           await wait();
//           expect(success).not.toHaveBeenCalled();
//           expect(error).toHaveBeenCalledWith(reason);
//         });
//       });

//       it("should not manipulate the passed-in config", () => {
//         module(($httpProvider) => {
//           $httpProvider.interceptors.push(() => ({
//             request(config) {
//               config.url = "/intercepted";
//               config.headers.foo = "intercepted";
//               return config;
//             },
//           }));
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           const config = { headers: { foo: "bar" } };
//           const configCopy = angular.copy(config);
//           $httpBackend.expect("GET", "/intercepted").respond("");
//           $http.get("/url", config);
//           await wait();
//           expect(config).toEqual(configCopy);
//           $httpBackend.expect("POST", "/intercepted").respond("");
//           $http.post("/url", { bar: "baz" }, config);
//           await wait();
//           expect(config).toEqual(configCopy);
//         });
//       });

//       it("should support interceptors defined as services", () => {
//         module(($provide, $httpProvider) => {
//           $provide.factory("myInterceptor", () => ({
//             request(config) {
//               config.url = "/intercepted";
//               return config;
//             },
//           }));
//           $httpProvider.interceptors.push("myInterceptor");
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           $httpBackend.expect("POST", "/intercepted").respond("");
//           $http.post("/url");
//           await wait();
//         });
//       });

//       it("should support complex interceptors based on promises", () => {
//         module(($provide, $httpProvider) => {
//           $provide.factory("myInterceptor", ($q, $rootScope) => ({
//             request(config) {
//               return $q.resolve("/intercepted").then((intercepted) => {
//                 config.url = intercepted;
//                 return config;
//               });
//             },
//           }));
//           $httpProvider.interceptors.push("myInterceptor");
//         });
//         inject(($http, $httpBackend, $rootScope) => {
//           $httpBackend.expect("POST", "/intercepted").respond("");
//           $http.post("/two");
//           await wait();
//         });
//       });
//     });
//   });

//   describe("the instance", () => {
//     let $httpBackend;
//     let $http;
//     let $rootScope;
//     let $sce;

//     beforeEach(
//       module(($sceDelegateProvider) => {
//         // Setup a special trusted url that we can use in testing JSONP requests
//         $sceDelegateProvider.trustedResourceUrlList([
//           "http://special.trusted.resource.com/**",
//         ]);
//       }),
//     );

//     beforeEach(inject([
//       "$httpBackend",
//       "$http",
//       "$rootScope",
//       "$sce",
//       function ($hb, $h, $rs, $sc) {
//         $httpBackend = $hb;
//         $http = $h;
//         $rootScope = $rs;
//         $sce = $sc;
//         spyOn($rootScope, "$apply").and.callThrough();
//       },
//     ]));

//     it("should throw error if the request configuration is not an object", () => {
//       expect(() => {
//         $http("/url");
//       }).toThrow(
//         "$http",
//         "badreq",
//         "Http request configuration must be an object.  Received: /url",
//       );
//     });

//     it("should throw error if the request configuration url is not a string nor a trusted object", () => {
//       expect(() => {
//         await $http({ url: false });
//       }).toThrow(
//         "$http",
//         "badreq",
//         "Http request configuration url must be a string or a $sce trusted object.  Received: false",
//       );
//       expect(() => {
//         await $http({ url: null });
//       }).toThrow(
//         "$http",
//         "badreq",
//         "Http request configuration url must be a string or a $sce trusted object.  Received: null",
//       );
//       expect(() => {
//         await $http({ url: 42 });
//       }).toThrow(
//         "$http",
//         "badreq",
//         "Http request configuration url must be a string or a $sce trusted object.  Received: 42",
//       );
//       expect(() => {
//         await $http({});
//       }).toThrow(
//         "$http",
//         "badreq",
//         "Http request configuration url must be a string or a $sce trusted object.  Received: undefined",
//       );
//     });

//     it("should accept a $sce trusted object for the request configuration url", () => {
//       $httpBackend.expect("GET", "/url").respond("");
//       await $http({ url: $sce.trustAsResourceUrl("/url") });
//     });

//     it("should send GET requests if no method specified", () => {
//       $httpBackend.expect("GET", "/url").respond("");
//       await $http({ url: "/url" });
//     });

//     it("should do basic request", () => {
//       $httpBackend.expect("GET", "/url").respond("");
//       await $http({ url: "/url", method: "GET" });
//     });

//     it("should pass data if specified", () => {
//       $httpBackend.expect("POST", "/url", "some-data").respond("");
//       await $http({ url: "/url", method: "POST", data: "some-data" });
//     });

//     describe("params", () => {
//       it("should do basic request with params and encode", () => {
//         $httpBackend.expect("GET", "/url?a%3D=%3F%26&b=2").respond("");
//         await $http({ url: "/url", params: { "a=": "?&", b: 2 }, method: "GET" });
//       });

//       it("should merge params if url contains some already", () => {
//         $httpBackend.expect("GET", "/url?c=3&a=1&b=2").respond("");
//         await $http({ url: "/url?c=3", params: { a: 1, b: 2 }, method: "GET" });
//       });

//       it("should jsonify objects in params map", () => {
//         $httpBackend.expect("GET", "/url?a=1&b=%7B%22c%22:3%7D").respond("");
//         await $http({ url: "/url", params: { a: 1, b: { c: 3 } }, method: "GET" });
//       });

//       it("should expand arrays in params map", () => {
//         $httpBackend.expect("GET", "/url?a=1&a=2&a=3").respond("");
//         await $http({ url: "/url", params: { a: [1, 2, 3] }, method: "GET" });
//       });

//       it("should not encode @ in url params", () => {
//         // encodeURIComponent is too aggressive and doesn't follow http://www.ietf.org/rfc/rfc3986.txt
//         // with regards to the character set (pchar) allowed in path segments
//         // so we need this test to make sure that we don't over-encode the params and break stuff
//         // like buzz api which uses @self

//         $httpBackend
//           .expect("GET", "/Path?!do%26h=g%3Da+h&:bar=$baz@1")
//           .respond("");
//         await $http({
//           url: "/Path",
//           params: { ":bar": "$baz@1", "!do&h": "g=a h" },
//           method: "GET",
//         });
//       });

//       it("should not add question mark when params is empty", () => {
//         $httpBackend.expect("GET", "/url").respond("");
//         await $http({ url: "/url", params: {}, method: "GET" });
//       });

//       it("should not double quote dates", () => {
//         $httpBackend
//           .expect("GET", "/url?date=2014-07-15T17:30:00.000Z")
//           .respond("");
//         await $http({
//           url: "/url",
//           params: { date: new Date("2014-07-15T17:30:00.000Z") },
//           method: "GET",
//         });
//       });

//       describe("custom params serialization", () => {
//         it("should allow specifying custom paramSerializer as function", () => {
//           $httpBackend.expect("GET", "/url?foo_bar").respond("");
//           await $http({
//             url: "/url",
//             params: { foo: "fooVal", bar: "barVal" },
//             paramSerializer: customParamSerializer,
//           });
//         });

//         it("should allow specifying custom paramSerializer as function from DI", () => {
//           $httpBackend.expect("GET", "/url?foo_bar").respond("");
//           await $http({
//             url: "/url",
//             params: { foo: "fooVal", bar: "barVal" },
//             paramSerializer: "customParamSerializer",
//           });
//         });
//       });
//     });

//     describe("callbacks", () => {
//       it("should pass in the response object when a request is successful", () => {
//         $httpBackend
//           .expect("GET", "/url")
//           .respond(207, "my content", { "content-encoding": "smurf" });
//         await $http({ url: "/url", method: "GET" }).then((response) => {
//           expect(response.data).toBe("my content");
//           expect(response.status).toBe(207);
//           expect(response.headers()).toEqual(
//             extend(Object.create(null), { "content-encoding": "smurf" }),
//           );
//           expect(response.config.url).toBe("/url");
//           callback();
//         });

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });

//       it("should pass statusText in response object when a request is successful", () => {
//         $httpBackend.expect("GET", "/url").respond(200, "SUCCESS", {}, "OK");
//         await $http({ url: "/url", method: "GET" }).then((response) => {
//           expect(response.statusText).toBe("OK");
//           callback();
//         });

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });

//       it("should pass statusText in response object when a request fails", () => {
//         $httpBackend
//           .expect("GET", "/url")
//           .respond(404, "ERROR", {}, "Not Found");
//         await $http({ url: "/url", method: "GET" }).then(null, (response) => {
//           expect(response.statusText).toBe("Not Found");
//           callback();
//         });

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });

//       it("should pass xhrStatus in response object when a request is successful", () => {
//         $httpBackend.expect("GET", "/url").respond(200, "SUCCESS", {}, "OK");
//         await $http({ url: "/url", method: "GET" }).then((response) => {
//           expect(response.xhrStatus).toBe("complete");
//           callback();
//         });

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });

//       it("should pass xhrStatus in response object when a request fails", () => {
//         $httpBackend
//           .expect("GET", "/url")
//           .respond(404, "ERROR", {}, "Not Found");
//         await $http({ url: "/url", method: "GET" }).then(null, (response) => {
//           expect(response.xhrStatus).toBe("complete");
//           callback();
//         });

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });

//       it("should pass in the response object when a request failed", () => {
//         $httpBackend
//           .expect("GET", "/url")
//           .respond(543, "bad error", { "request-id": "123" });
//         await $http({ url: "/url", method: "GET" }).then(null, (response) => {
//           expect(response.data).toBe("bad error");
//           expect(response.status).toBe(543);
//           expect(response.headers()).toEqual(
//             extend(Object.create(null), { "request-id": "123" }),
//           );
//           expect(response.config.url).toBe("/url");
//           callback();
//         });

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });
//     });

//     describe("response headers", () => {
//       it("should return single header", () => {
//         $httpBackend.expect("GET", "/url").respond("", { date: "date-val" });
//         callback.and.callFake((r) => {
//           expect(r.headers("date")).toBe("date-val");
//         });

//         await $http({ url: "/url", method: "GET" }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//       });

//       it("should return null when single header does not exist", () => {
//         $httpBackend
//           .expect("GET", "/url")
//           .respond("", { "Some-Header": "Fake" });
//         callback.and.callFake((r) => {
//           r.headers(); // we need that to get headers parsed first
//           expect(r.headers("nothing")).toBe(null);
//         });

//         await $http({ url: "/url", method: "GET" }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//       });

//       it("should return all headers as object", () => {
//         $httpBackend.expect("GET", "/url").respond("", {
//           "content-encoding": "gzip",
//           server: "Apache",
//         });

//         callback.and.callFake((r) => {
//           expect(r.headers()).toEqual(
//             extend(Object.create(null), {
//               "content-encoding": "gzip",
//               server: "Apache",
//             }),
//           );
//         });

//         await $http({ url: "/url", method: "GET" }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//       });

//       it("should return empty object for jsonp request", () => {
//         callback.and.callFake((r) => {
//           expect(r.headers()).toEqual(Object.create(null));
//         });

//         $httpBackend
//           .expect("JSONP", "/some?callback=JSON_CALLBACK")
//           .respond(200);
//         await $http({ url: $sce.trustAsResourceUrl("/some"), method: "JSONP" }).then(
//           callback,
//         );
//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//       });
//     });

//     describe("response headers parser", () => {
//       /* global parseHeaders: false */

//       it("should parse basic", () => {
//         const parsed = parseHeaders(
//           "date: Thu, 04 Aug 2011 20:23:08 GMT\n" +
//             "content-encoding: gzip\n" +
//             "transfer-encoding: chunked\n" +
//             "x-cache-info: not cacheable; response has already expired, not cacheable; response has already expired\n" +
//             "connection: Keep-Alive\n" +
//             "x-backend-server: pm-dekiwiki03\n" +
//             "pragma: no-cache\n" +
//             "server: Apache\n" +
//             "x-frame-options: DENY\n" +
//             "content-type: text/html; charset=utf-8\n" +
//             "vary: Cookie, Accept-Encoding\n" +
//             "keep-alive: timeout=5, max=1000\n" +
//             "expires: Thu: , 19 Nov 1981 08:52:00 GMT\n",
//         );

//         expect(parsed.date).toBe("Thu, 04 Aug 2011 20:23:08 GMT");
//         expect(parsed["content-encoding"]).toBe("gzip");
//         expect(parsed["transfer-encoding"]).toBe("chunked");
//         expect(parsed["keep-alive"]).toBe("timeout=5, max=1000");
//       });

//       it("should parse lines without space after colon", () => {
//         expect(parseHeaders("key:value").key).toBe("value");
//       });

//       it("should trim the values", () => {
//         expect(parseHeaders("key:    value ").key).toBe("value");
//       });

//       it("should allow headers without value", () => {
//         expect(parseHeaders("key:").key).toBe("");
//       });

//       it("should merge headers with same key", () => {
//         expect(parseHeaders("key: a\nkey:b\n").key).toBe("a, b");
//       });

//       it("should normalize keys to lower case", () => {
//         expect(parseHeaders("KeY: value").key).toBe("value");
//       });

//       it("should parse CRLF as delimiter", () => {
//         // IE does use CRLF
//         expect(parseHeaders("a: b\r\nc: d\r\n")).toEqual(
//           extend(Object.create(null), { a: "b", c: "d" }),
//         );
//         expect(parseHeaders("a: b\r\nc: d\r\n").a).toBe("b");
//       });

//       it("should parse tab after semi-colon", () => {
//         expect(parseHeaders("a:\tbb").a).toBe("bb");
//         expect(parseHeaders("a: \tbb").a).toBe("bb");
//       });

//       it("should parse multiple values for the same header", () => {
//         expect(parseHeaders("key:value1\nkey:value2").key).toBe(
//           "value1, value2",
//         );
//       });
//     });

//     describe("request headers", () => {
//       it("should send custom headers", () => {
//         $httpBackend
//           .expect(
//             "GET",
//             "/url",
//             undefined,
//             (headers) => headers.Custom === "header",
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "GET",
//           headers: {
//             Custom: "header",
//           },
//         });

//         $httpBackend.flush();
//       });

//       it("should set default headers for GET request", () => {
//         $httpBackend
//           .expect(
//             "GET",
//             "/url",
//             undefined,
//             (headers) => headers.Accept === "application/json, text/plain, */*",
//           )
//           .respond("");

//         await $http({ url: "/url", method: "GET", headers: {} });
//         $httpBackend.flush();
//       });

//       it("should set default headers for POST request", () => {
//         $httpBackend
//           .expect(
//             "POST",
//             "/url",
//             "messageBody",
//             (headers) =>
//               headers.Accept === "application/json, text/plain, */*" &&
//               headers["Content-Type"] === "application/json;charset=utf-8",
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "POST",
//           headers: {},
//           data: "messageBody",
//         });
//         $httpBackend.flush();
//       });

//       it("should set default headers for PUT request", () => {
//         $httpBackend
//           .expect(
//             "PUT",
//             "/url",
//             "messageBody",
//             (headers) =>
//               headers.Accept === "application/json, text/plain, */*" &&
//               headers["Content-Type"] === "application/json;charset=utf-8",
//           )
//           .respond("");

//         await $http({ url: "/url", method: "PUT", headers: {}, data: "messageBody" });
//         $httpBackend.flush();
//       });

//       it("should set default headers for PATCH request", () => {
//         $httpBackend
//           .expect(
//             "PATCH",
//             "/url",
//             "messageBody",
//             (headers) =>
//               headers.Accept === "application/json, text/plain, */*" &&
//               headers["Content-Type"] === "application/json;charset=utf-8",
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "PATCH",
//           headers: {},
//           data: "messageBody",
//         });
//         $httpBackend.flush();
//       });

//       it("should set default headers for custom HTTP method", () => {
//         $httpBackend
//           .expect(
//             "FOO",
//             "/url",
//             undefined,
//             (headers) => headers.Accept === "application/json, text/plain, */*",
//           )
//           .respond("");

//         await $http({ url: "/url", method: "FOO", headers: {} });
//         $httpBackend.flush();
//       });

//       it("should override default headers with custom", () => {
//         $httpBackend
//           .expect(
//             "POST",
//             "/url",
//             "messageBody",
//             (headers) =>
//               headers.Accept === "Rewritten" &&
//               headers["Content-Type"] === "Rewritten",
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "POST",
//           data: "messageBody",
//           headers: {
//             Accept: "Rewritten",
//             "Content-Type": "Rewritten",
//           },
//         });
//         $httpBackend.flush();
//       });

//       it("should delete default headers if custom header function returns null", () => {
//         $httpBackend
//           .expect(
//             "POST",
//             "/url",
//             "messageBody",
//             (headers) => !("Accept" in headers),
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "POST",
//           data: "messageBody",
//           headers: {
//             Accept: function() {
//               return null;
//             },
//           },
//         });
//         $httpBackend.flush();
//       });

//       it("should override default headers with custom in a case insensitive manner", () => {
//         $httpBackend
//           .expect(
//             "POST",
//             "/url",
//             "messageBody",
//             (headers) =>
//               headers.accept === "Rewritten" &&
//               headers["content-type"] === "Content-Type Rewritten" &&
//               isUndefined(headers.Accept) &&
//               isUndefined(headers["Content-Type"]),
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "POST",
//           data: "messageBody",
//           headers: {
//             accept: "Rewritten",
//             "content-type": "Content-Type Rewritten",
//           },
//         });
//         $httpBackend.flush();
//       });

//       it("should not send Content-Type header if request data/body is undefined", () => {
//         $httpBackend
//           .expect(
//             "POST",
//             "/url",
//             undefined,
//             (headers) => !headers.hasOwnProperty("Content-Type"),
//           )
//           .respond("");

//         $httpBackend
//           .expect(
//             "POST",
//             "/url2",
//             undefined,
//             (headers) => !headers.hasOwnProperty("content-type"),
//           )
//           .respond("");

//         await $http({ url: "/url", method: "POST" });
//         await $http({
//           url: "/url2",
//           method: "POST",
//           headers: { "content-type": "Rewritten" },
//         });
//         $httpBackend.flush();
//       });

//       it("should NOT delete Content-Type header if request data/body is set by request transform", () => {
//         $httpBackend
//           .expect(
//             "POST",
//             "/url",
//             { one: "two" },
//             (headers) =>
//               headers["Content-Type"] === "application/json;charset=utf-8",
//           )
//           .respond("");

//         await $http({
//           url: "/url",
//           method: "POST",
//           transformRequest(data) {
//             data = { one: "two" };
//             return data;
//           },
//         });

//         $httpBackend.flush();
//       });

//       it("should send execute result if header value is function", () => {
//         const headerConfig = {
//           Accept: function () {
//             return "Rewritten";
//           },
//         };

//         function checkHeaders(headers) {
//           return headers.Accept === "Rewritten";
//         }

//         $httpBackend.expect("GET", "/url", undefined, checkHeaders).respond("");
//         $httpBackend
//           .expect("POST", "/url", undefined, checkHeaders)
//           .respond("");
//         $httpBackend.expect("PUT", "/url", undefined, checkHeaders).respond("");
//         $httpBackend
//           .expect("PATCH", "/url", undefined, checkHeaders)
//           .respond("");
//         $httpBackend
//           .expect("DELETE", "/url", undefined, checkHeaders)
//           .respond("");

//         await $http({ url: "/url", method: "GET", headers: headerConfig });
//         await $http({ url: "/url", method: "POST", headers: headerConfig });
//         await $http({ url: "/url", method: "PUT", headers: headerConfig });
//         await $http({ url: "/url", method: "PATCH", headers: headerConfig });
//         await $http({ url: "/url", method: "DELETE", headers: headerConfig });

//         $httpBackend.flush();
//       });

//       it("should expose a config object to header functions", () => {
//         const config = {
//           foo: "Rewritten",
//           headers: {
//             Accept: function (config) {
//               return config.foo;
//             },
//           },
//         };

//         $httpBackend
//           .expect("GET", "/url", undefined, { Accept: "Rewritten" })
//           .respond("");
//         $http.get("/url", config);
//         $httpBackend.flush();
//       });

//       it("should not allow modifications to a config object in header functions", () => {
//         const config = {
//           headers: {
//             Accept: function (config) {
//               config.foo = "bar";
//               return "Rewritten";
//             },
//           },
//         };

//         $httpBackend
//           .expect("GET", "/url", undefined, { Accept: "Rewritten" })
//           .respond("");
//         $http.get("/url", config);
//         $httpBackend.flush();

//         expect(config.foo).toBeUndefined();
//       });
//     });

//     describe("short methods", () => {
//       function checkHeader(name, value) {
//         return function (headers) {
//           return headers[name] === value;
//         };
//       }

//       it("should have get()", () => {
//         $httpBackend.expect("GET", "/url").respond("");
//         $http.get("/url");
//       });

//       it("get() should allow config param", () => {
//         $httpBackend
//           .expect("GET", "/url", undefined, checkHeader("Custom", "Header"))
//           .respond("");
//         $http.get("/url", { headers: { Custom: "Header" } });
//       });

//       it("should handle empty response header", () => {
//         $httpBackend.expect("GET", "/url", undefined).respond(200, "", {
//           "Custom-Empty-Response-Header": "",
//           Constructor: "",
//         });
//         $http.get("/url").then(callback);
//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//         const { headers } = callback.calls.mostRecent().args[0];
//         expect(headers("custom-empty-response-Header")).toEqual("");
//         expect(headers("ToString")).toBe(null);
//         expect(headers("Constructor")).toBe("");
//       });

//       it("should have delete()", () => {
//         $httpBackend.expect("DELETE", "/url").respond("");
//         $http.delete("/url");
//       });

//       it("delete() should allow config param", () => {
//         $httpBackend
//           .expect("DELETE", "/url", undefined, checkHeader("Custom", "Header"))
//           .respond("");
//         $http.delete("/url", { headers: { Custom: "Header" } });
//       });

//       it("should have head()", () => {
//         $httpBackend.expect("HEAD", "/url").respond("");
//         $http.head("/url");
//       });

//       it("head() should allow config param", () => {
//         $httpBackend
//           .expect("HEAD", "/url", undefined, checkHeader("Custom", "Header"))
//           .respond("");
//         $http.head("/url", { headers: { Custom: "Header" } });
//       });

//       it("should have post()", () => {
//         $httpBackend.expect("POST", "/url", "some-data").respond("");
//         $http.post("/url", "some-data");
//       });

//       it("post() should allow config param", () => {
//         $httpBackend
//           .expect("POST", "/url", "some-data", checkHeader("Custom", "Header"))
//           .respond("");
//         $http.post("/url", "some-data", { headers: { Custom: "Header" } });
//       });

//       it("should have put()", () => {
//         $httpBackend.expect("PUT", "/url", "some-data").respond("");
//         $http.put("/url", "some-data");
//       });

//       it("put() should allow config param", () => {
//         $httpBackend
//           .expect("PUT", "/url", "some-data", checkHeader("Custom", "Header"))
//           .respond("");
//         $http.put("/url", "some-data", { headers: { Custom: "Header" } });
//       });

//       it("should have patch()", () => {
//         $httpBackend.expect("PATCH", "/url", "some-data").respond("");
//         $http.patch("/url", "some-data");
//       });

//       it("patch() should allow config param", () => {
//         $httpBackend
//           .expect("PATCH", "/url", "some-data", checkHeader("Custom", "Header"))
//           .respond("");
//         $http.patch("/url", "some-data", { headers: { Custom: "Header" } });
//       });

//     });
//     describe("callbacks", () => {
//       it("should $apply after success callback", () => {
//         $httpBackend.when("GET").respond(200);
//         await $http({ method: "GET", url: "/some" });
//         $httpBackend.flush();
//         expect($rootScope.$apply).toHaveBeenCalled();
//       });

//       it("should $apply after error callback", () => {
//         $httpBackend.when("GET").respond(404);
//         await $http({ method: "GET", url: "/some" }).catch(() => {});
//         $httpBackend.flush();
//         expect($rootScope.$apply).toHaveBeenCalled();
//       });

//       it("should $apply even if exception thrown during callback", inject((
//         $exceptionHandler,
//       ) => {
//         $httpBackend.when("GET").respond(200);
//         callback.and.throwError("error in callback");

//         await $http({ method: "GET", url: "/some" }).then(callback);
//         $httpBackend.flush();
//         expect($rootScope.$apply).toHaveBeenCalled();

//         $exceptionHandler.errors = [];
//       }));

//       it("should pass the event handlers through to the backend", () => {
//         const progressFn = jasmine.createSpy("progressFn");
//         const uploadProgressFn = jasmine.createSpy("uploadProgressFn");
//         $httpBackend.when("GET").respond(200);
//         await $http({
//           method: "GET",
//           url: "/some",
//           eventHandlers: { progress: progressFn },
//           uploadEventHandlers: { progress: uploadProgressFn },
//         });
//         await wait();
//         const mockXHR = MockXhr.$$lastInstance;
//         expect(mockXHR.$$events.progress).toEqual(jasmine.any(Function));
//         expect(mockXHR.upload.$$events.progress).toEqual(jasmine.any(Function));

//         const eventObj = {};
//         spyOn($rootScope, "$digest");

//         mockXHR.$$events.progress(eventObj);
//         expect(progressFn).toHaveBeenCalledOnceWith(eventObj);
//         expect($rootScope.$digest).toHaveBeenCalledTimes(1);

//         mockXHR.upload.$$events.progress(eventObj);
//         expect(uploadProgressFn).toHaveBeenCalledOnceWith(eventObj);
//         expect($rootScope.$digest).toHaveBeenCalledTimes(2);
//       });
//     });

//     describe("transformData", () => {
//       describe("request", () => {
//         describe("default", () => {
//           it("should transform object into json", () => {
//             $httpBackend.expect("POST", "/url", '{"one":"two"}').respond("");
//             await $http({ method: "POST", url: "/url", data: { one: "two" } });
//           });

//           it("should transform object with date into json", () => {
//             $httpBackend
//               .expect("POST", "/url", {
//                 date: new Date(Date.UTC(2013, 11, 25)),
//               })
//               .respond("");
//             await $http({
//               method: "POST",
//               url: "/url",
//               data: { date: new Date(Date.UTC(2013, 11, 25)) },
//             });
//           });

//           it("should ignore strings", () => {
//             $httpBackend.expect("POST", "/url", "string-data").respond("");
//             await $http({ method: "POST", url: "/url", data: "string-data" });
//           });

//           it("should ignore File objects", () => {
//             const file = {
//               some: true,
//               // $httpBackend compares toJson values by default,
//               // we need to be sure it's not serialized into json string
//               test(actualValue) {
//                 return this === actualValue;
//               },
//             };

//             // I'm really sorry for doing this :-D
//             // Unfortunately I don't know how to trick toString.apply(obj) comparison
//             spyOn(window, "isFile").and.returnValue(true);

//             $httpBackend.expect("POST", "/some", file).respond("");
//             await $http({ method: "POST", url: "/some", data: file });
//           });
//         });

//         it("should ignore Blob objects", () => {
//           if (!window.Blob) return;

//           const blob = new Blob(["blob!"], { type: "text/plain" });

//           $httpBackend.expect("POST", "/url", "[object Blob]").respond("");
//           await $http({ method: "POST", url: "/url", data: blob });
//         });

//         it("should ignore FormData objects", () => {
//           if (!window.FormData) return;

//           const formData = new FormData();
//           formData.append("angular", "is great");

//           $httpBackend.expect("POST", "/url", "[object FormData]").respond("");
//           await $http({ method: "POST", url: "/url", data: formData });
//         });

//         it("should have access to request headers", () => {
//           $httpBackend.expect("POST", "/url", "header1").respond(200);
//           $http
//             .post("/url", "req", {
//               headers: { h1: "header1" },
//               transformRequest(data, headers) {
//                 return headers("h1");
//               },
//             })
//             .then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//         });

//         it("should have access to request headers with mixed case", () => {
//           $httpBackend.expect("POST", "/url", "header1").respond(200);
//           $http
//             .post("/url", "req", {
//               headers: { H1: "header1" },
//               transformRequest(data, headers) {
//                 return headers("H1");
//               },
//             })
//             .then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//         });

//         it("should not allow modifications to headers in a transform functions", () => {
//           const config = {
//             headers: { Accept: "bar" },
//             transformRequest(data, headers) {
//               angular.extend(headers(), {
//                 Accept: "foo",
//               });
//             },
//           };

//           $httpBackend
//             .expect("GET", "/url", undefined, { Accept: "bar" })
//             .respond(200);
//           $http.get("/url", config).then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//         });

//         it("should pipeline more functions", () => {
//           function first(d, h) {
//             return `${d}-first:${h("h1")}`;
//           }
//           function second(d) {
//             return uppercase(d);
//           }

//           $httpBackend.expect("POST", "/url", "REQ-FIRST:V1").respond(200);
//           $http
//             .post("/url", "req", {
//               headers: { h1: "v1" },
//               transformRequest: [first, second],
//             })
//             .then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//         });
//       });

//       describe("response", () => {
//         describe("default", () => {
//           it("should deserialize json objects", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond('{"foo":"bar","baz":23}');
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual({
//               foo: "bar",
//               baz: 23,
//             });
//           });

//           it("should deserialize json arrays", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond('[1, "abc", {"foo":"bar"}]');
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual([
//               1,
//               "abc",
//               { foo: "bar" },
//             ]);
//           });

//           it("should ignore leading/trailing whitespace", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond('  \n  {"foo":"bar","baz":23}  \r\n  \n  ');
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual({
//               foo: "bar",
//               baz: 23,
//             });
//           });

//           it("should deserialize json numbers when response header contains application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("123", { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(123);
//           });

//           it("should deserialize json strings when response header contains application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond('"asdf"', { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual("asdf");
//           });

//           it("should deserialize json nulls when response header contains application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("null", { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(null);
//           });

//           it("should deserialize json true when response header contains application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("true", { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(true);
//           });

//           it("should deserialize json false when response header contains application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("false", { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(false);
//           });

//           it("should deserialize json empty string when response header contains application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond('""', { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual("");
//           });

//           it("should deserialize json with security prefix", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond(')]}\',\n[1, "abc", {"foo":"bar"}]');
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual([
//               1,
//               "abc",
//               { foo: "bar" },
//             ]);
//           });

//           it('should deserialize json with security prefix ")]}\'"', () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond(')]}\'\n\n[1, "abc", {"foo":"bar"}]');
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual([
//               1,
//               "abc",
//               { foo: "bar" },
//             ]);
//           });

//           it("should retain security prefix if response is not json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond(")]}',\n This is not JSON !");
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(
//               ")]}',\n This is not JSON !",
//             );
//           });

//           it("should not attempt to deserialize json when HEAD request", () => {
//             // per http spec for Content-Type, HEAD request should return a Content-Type header
//             // set to what the content type would have been if a get was sent
//             $httpBackend
//               .expect("HEAD", "/url")
//               .respond("", { "Content-Type": "application/json" });
//             await $http({ method: "HEAD", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual("");
//           });

//           it("should not attempt to deserialize json for an empty response whose header contains application/json", () => {
//             // per http spec for Content-Type, HEAD request should return a Content-Type header
//             // set to what the content type would have been if a get was sent
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("", { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual("");
//           });

//           it("should not attempt to deserialize json for a blank response whose header contains application/json", () => {
//             // per http spec for Content-Type, HEAD request should return a Content-Type header
//             // set to what the content type would have been if a get was sent
//             $httpBackend
//               .expect("GET", "/url")
//               .respond(" ", { "Content-Type": "application/json" });
//             await $http({ method: "GET", url: "/url" }).then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(" ");
//           });

//           it("should not deserialize tpl beginning with ng expression", () => {
//             $httpBackend.expect("GET", "/url").respond("{{some}}");
//             $http.get("/url").then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//             expect(callback.calls.mostRecent().args[0].data).toEqual(
//               "{{some}}",
//             );
//           });

//           it("should not deserialize json when the opening and closing brackets do not match", () => {
//             $httpBackend
//               .expect("GET", "/url1")
//               .respond("[Code](url): () => {}");
//             $httpBackend
//               .expect("GET", "/url2")
//               .respond('{"is": "not"} ["json"]');
//             $http.get("/url1").then(callback);
//             $http.get("/url2").then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalledTimes(2);
//             expect(callback.calls.argsFor(0)[0].data).toEqual(
//               "[Code](url): () => {}",
//             );
//             expect(callback.calls.argsFor(1)[0].data).toEqual(
//               '{"is": "not"} ["json"]',
//             );
//           });

//           it("should return JSON data with error message if JSON is invalid", () => {
//             const errCallback = jasmine.createSpy("error");
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("{abcd}", { "Content-Type": "application/json" });
//             $http.get("/url").then(callback).catch(errCallback);
//             $httpBackend.flush();

//             expect(callback).not.toHaveBeenCalled();
//             expect(errCallback).toHaveBeenCalled();
//             expect(errCallback.calls.mostRecent().args[0]).toEqualMinErr(
//               "$http",
//               "baddata",
//             );
//           });

//           it("should not throw an error if JSON is invalid but content-type is not application/json", () => {
//             $httpBackend
//               .expect("GET", "/url")
//               .respond("{abcd}", { "Content-Type": "text/plain" });

//             $http.get("/url").then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//           });

//           it("should not throw an error if JSON is invalid but content-type is not specified", () => {
//             $httpBackend.expect("GET", "/url").respond("{abcd}");

//             $http.get("/url").then(callback);
//             $httpBackend.flush();

//             expect(callback).toHaveBeenCalled();
//           });

//           it("should return response unprocessed if JSON is invalid but content-type is not application/json", () => {
//             const response = "{abcd}";
//             $httpBackend
//               .expect("GET", "/url")
//               .respond(response, { "Content-Type": "text/plain" });

//             $http.get("/url").then(callback);
//             $httpBackend.flush();

//             expect(callback.calls.mostRecent().args[0].data).toBe(response);
//           });

//           it("should return response unprocessed if JSON is invalid but content-type is not specified", () => {
//             const response = "{abcd}";
//             $httpBackend.expect("GET", "/url").respond(response);

//             $http.get("/url").then(callback);
//             $httpBackend.flush();

//             expect(callback.calls.mostRecent().args[0].data).toBe(response);
//           });
//         });

//         it("should have access to response headers", () => {
//           $httpBackend
//             .expect("GET", "/url")
//             .respond(200, "response", { h1: "header1" });
//           $http
//             .get("/url", {
//               transformResponse(data, headers) {
//                 return headers("h1");
//               },
//             })
//             .then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//           expect(callback.calls.mostRecent().args[0].data).toBe("header1");
//         });

//         it("should have access to response status", () => {
//           $httpBackend
//             .expect("GET", "/url")
//             .respond(200, "response", { h1: "header1" });
//           $http
//             .get("/url", {
//               transformResponse(data, headers, status) {
//                 return status;
//               },
//             })
//             .then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//           expect(callback.calls.mostRecent().args[0].data).toBe(200);
//         });

//         it("should pipeline more functions", () => {
//           function first(d, h) {
//             return `${d}-first:${h("h1")}`;
//           }
//           function second(d) {
//             return uppercase(d);
//           }

//           $httpBackend
//             .expect("POST", "/url")
//             .respond(200, "resp", { h1: "v1" });
//           $http
//             .post("/url", "", { transformResponse: [first, second] })
//             .then(callback);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalled();
//           expect(callback.calls.mostRecent().args[0].data).toBe(
//             "RESP-FIRST:V1",
//           );
//         });

//         it("should apply `transformResponse` even if the response data is empty", () => {
//           const callback = jasmine.createSpy("transformResponse");
//           const config = { transformResponse: callback };

//           $httpBackend.expect("GET", "/url1").respond(200, undefined);
//           $httpBackend.expect("GET", "/url2").respond(200, null);
//           $httpBackend.expect("GET", "/url3").respond(200, "");
//           $http.get("/url1", config);
//           $http.get("/url2", config);
//           $http.get("/url3", config);
//           $httpBackend.flush();

//           expect(callback).toHaveBeenCalledTimes(3);
//           expect(callback.calls.argsFor(0)[0]).toBeUndefined();
//           expect(callback.calls.argsFor(1)[0]).toBe(null);
//           expect(callback.calls.argsFor(2)[0]).toBe("");
//         });
//       });
//     });

//     describe("cache", () => {
//       let cache;

//       beforeEach(inject(($cacheFactory) => {
//         cache = $cacheFactory("testCache");
//       }));

//       function doFirstCacheRequest(method, respStatus, headers) {
//         $httpBackend
//           .expect(method || "GET", "/url")
//           .respond(respStatus || 200, "content", headers);
//         await $http({ method: method || "GET", url: "/url", cache }).catch(() => {});
//         $httpBackend.flush();
//       }

//       it("should cache GET request when cache is provided", inject((
//         $rootScope,
//       ) => {
//         doFirstCacheRequest();

//         await $http({ method: "get", url: "/url", cache }).then(callback);
//         ;

//         expect(callback).toHaveBeenCalled();
//         expect(callback.calls.mostRecent().args[0].data).toBe("content");
//       }));

//       it("should cache JSONP request when cache is provided", inject((
//         $rootScope,
//       ) => {
//         $httpBackend
//           .expect("JSONP", "/url?callback=JSON_CALLBACK")
//           .respond("content");
//         await $http({ method: "JSONP", url: $sce.trustAsResourceUrl("/url"), cache });
//         $httpBackend.flush();

//         await $http({
//           method: "JSONP",
//           url: $sce.trustAsResourceUrl("/url"),
//           cache,
//         }).then(callback);
//         ;

//         expect(callback).toHaveBeenCalled();
//         expect(callback.calls.mostRecent().args[0].data).toBe("content");
//       }));

//       it("should cache request when cache is provided and no method specified", () => {
//         doFirstCacheRequest();

//         await $http({ url: "/url", cache }).then(callback);
//         ;

//         expect(callback).toHaveBeenCalled();
//         expect(callback.calls.mostRecent().args[0].data).toBe("content");
//       });

//       it("should not cache when cache is not provided", () => {
//         doFirstCacheRequest();

//         $httpBackend.expect("GET", "/url").respond();
//         await $http({ method: "GET", url: "/url" });
//       });

//       it("should perform request when cache cleared", () => {
//         doFirstCacheRequest();

//         cache.removeAll();
//         $httpBackend.expect("GET", "/url").respond();
//         await $http({ method: "GET", url: "/url", cache });
//       });

//       it("should always call callback asynchronously", () => {
//         doFirstCacheRequest();
//         await $http({ method: "get", url: "/url", cache }).then(callback);

//         expect(callback).not.toHaveBeenCalled();
//       });

//       it("should not cache POST request", () => {
//         doFirstCacheRequest("POST");

//         $httpBackend.expect("POST", "/url").respond("content2");
//         await $http({ method: "POST", url: "/url", cache }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//         expect(callback.calls.mostRecent().args[0].data).toBe("content2");
//       });

//       it("should not cache PUT request", () => {
//         doFirstCacheRequest("PUT");

//         $httpBackend.expect("PUT", "/url").respond("content2");
//         await $http({ method: "PUT", url: "/url", cache }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//         expect(callback.calls.mostRecent().args[0].data).toBe("content2");
//       });

//       it("should not cache DELETE request", () => {
//         doFirstCacheRequest("DELETE");

//         $httpBackend.expect("DELETE", "/url").respond(206);
//         await $http({ method: "DELETE", url: "/url", cache }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//       });

//       it("should not cache non 2xx responses", () => {
//         doFirstCacheRequest("GET", 404);

//         $httpBackend.expect("GET", "/url").respond("content2");
//         await $http({ method: "GET", url: "/url", cache }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//         expect(callback.calls.mostRecent().args[0].data).toBe("content2");
//       });

//       it("should cache the headers as well", inject(($rootScope) => {
//         doFirstCacheRequest("GET", 200, {
//           "content-encoding": "gzip",
//           server: "Apache",
//         });
//         callback.and.callFake((response) => {
//           expect(response.headers()).toEqual(
//             extend(Object.create(null), {
//               "content-encoding": "gzip",
//               server: "Apache",
//             }),
//           );
//           expect(response.headers("server")).toBe("Apache");
//         });

//         await $http({ method: "GET", url: "/url", cache }).then(callback);
//         ;
//         expect(callback).toHaveBeenCalled();
//       }));

//       it("should not share the cached headers object instance", inject((
//         $rootScope,
//       ) => {
//         doFirstCacheRequest("GET", 200, {
//           "content-encoding": "gzip",
//           server: "Apache",
//         });
//         callback.and.callFake((response) => {
//           expect(response.headers()).toEqual(cache.get("/url")[2]);
//           expect(response.headers()).not.toBe(cache.get("/url")[2]);
//         });

//         await $http({ method: "GET", url: "/url", cache }).then(callback);
//         ;
//         expect(callback).toHaveBeenCalled();
//       }));

//       it("should not share the pending cached headers object instance", inject((
//         $rootScope,
//       ) => {
//         let firstResult;
//         callback.and.callFake((result) => {
//           expect(result.headers()).toEqual(firstResult.headers());
//           expect(result.headers()).not.toBe(firstResult.headers());
//         });

//         $httpBackend.expect("GET", "/url").respond(200, "content", {
//           "content-encoding": "gzip",
//           server: "Apache",
//         });
//         await $http({ method: "GET", url: "/url", cache }).then((result) => {
//           firstResult = result;
//         });
//         await $http({ method: "GET", url: "/url", cache }).then(callback);
//         $httpBackend.flush();

//         expect(callback).toHaveBeenCalled();
//       }));

//       it("should cache status code as well", inject(($rootScope) => {
//         doFirstCacheRequest("GET", 201);
//         callback.and.callFake((response) => {
//           expect(response.status).toBe(201);
//         });

//         await $http({ method: "get", url: "/url", cache }).then(callback);
//         ;
//         expect(callback).toHaveBeenCalled();
//       }));

//       it("should cache xhrStatus as well", inject(($rootScope) => {
//         doFirstCacheRequest("GET", 201, null);
//         callback.and.callFake((response) => {
//           expect(response.xhrStatus).toBe("complete");
//         });

//         await $http({ method: "get", url: "/url", cache }).then(callback);
//         ;
//         expect(callback).toHaveBeenCalled();
//       }));

//       it("should use cache even if second request was made before the first returned", () => {
//         $httpBackend.expect("GET", "/url").respond(201, "fake-response");

//         callback.and.callFake((response) => {
//           expect(response.data).toBe("fake-response");
//           expect(response.status).toBe(201);
//         });

//         await $http({ method: "GET", url: "/url", cache }).then(callback);
//         await $http({ method: "GET", url: "/url", cache }).then(callback);

//         $httpBackend.flush();
//         expect(callback).toHaveBeenCalled();
//         expect(callback).toHaveBeenCalledTimes(2);
//       });

//       it("should preserve config object when resolving from cache", () => {
//         $httpBackend.expect("GET", "/url").respond(200, "content");
//         await $http({ method: "GET", url: "/url", cache, headers: { foo: "bar" } });
//         $httpBackend.flush();

//         await $http({
//           method: "GET",
//           url: "/url",
//           cache,
//           headers: { foo: "baz" },
//         }).then(callback);
//         ;

//         expect(callback.calls.mostRecent().args[0].config.headers.foo).toBe(
//           "baz",
//         );
//       });

//       it("should preserve config object when resolving from pending cache", () => {
//         $httpBackend.expect("GET", "/url").respond(200, "content");
//         await $http({ method: "GET", url: "/url", cache, headers: { foo: "bar" } });

//         await $http({
//           method: "GET",
//           url: "/url",
//           cache,
//           headers: { foo: "baz" },
//         }).then(callback);
//         $httpBackend.flush();

//         expect(callback.calls.mostRecent().args[0].config.headers.foo).toBe(
//           "baz",
//         );
//       });

//       it("should preserve config object when rejecting from pending cache", () => {
//         $httpBackend.expect("GET", "/url").respond(404, "content");
//         await $http({
//           method: "GET",
//           url: "/url",
//           cache,
//           headers: { foo: "bar" },
//         }).catch(() => {});

//         await $http({
//           method: "GET",
//           url: "/url",
//           cache,
//           headers: { foo: "baz" },
//         }).catch(callback);
//         $httpBackend.flush();

//         expect(callback.calls.mostRecent().args[0].config.headers.foo).toBe(
//           "baz",
//         );
//       });

//       it("should allow the cached value to be an empty string", () => {
//         cache.put("/abc", "");

//         callback.and.callFake((response) => {
//           expect(response.data).toBe("");
//           expect(response.status).toBe(200);
//         });

//         await $http({ method: "GET", url: "/abc", cache }).then(callback);
//         ;
//         expect(callback).toHaveBeenCalled();
//       });

//       it("should default to status code 200 and empty headers if cache contains a non-array element", inject((
//         $rootScope,
//       ) => {
//         cache.put("/myurl", "simple response");
//         $http.get("/myurl", { cache }).then((response) => {
//           expect(response.data).toBe("simple response");
//           expect(response.status).toBe(200);
//           expect(response.headers()).toEqual(Object.create(null));
//           callback();
//         });

//         ;
//         expect(callback).toHaveBeenCalled();
//       }));

//       describe("$http.defaults.cache", () => {
//         it("should be undefined by default", () => {
//           expect($http.defaults.cache).toBeUndefined();
//         });

//         it("should cache requests when no cache given in request config", () => {
//           $http.defaults.cache = cache;

//           // First request fills the cache from server response.
//           $httpBackend.expect("GET", "/url").respond(200, "content");
//           await $http({ method: "GET", url: "/url" }); // Notice no cache given in config.
//           $httpBackend.flush();

//           // Second should be served from cache, without sending request to server.
//           await $http({ method: "get", url: "/url" }).then(callback);
//           ;

//           expect(callback).toHaveBeenCalled();
//           expect(callback.calls.mostRecent().args[0].data).toBe("content");

//           // Invalidate cache entry.
//           $http.defaults.cache.remove("/url");

//           // After cache entry removed, a request should be sent to server.
//           $httpBackend.expect("GET", "/url").respond(200, "content");
//           await $http({ method: "GET", url: "/url" });
//           $httpBackend.flush();
//         });

//         it("should have less priority than explicitly given cache", inject((
//           $cacheFactory,
//         ) => {
//           const localCache = $cacheFactory("localCache");
//           $http.defaults.cache = cache;

//           // Fill local cache.
//           $httpBackend
//             .expect("GET", "/url")
//             .respond(200, "content-local-cache");
//           await $http({ method: "GET", url: "/url", cache: localCache });
//           $httpBackend.flush();

//           // Fill default cache.
//           $httpBackend
//             .expect("GET", "/url")
//             .respond(200, "content-default-cache");
//           await $http({ method: "GET", url: "/url" });
//           $httpBackend.flush();

//           // Serve request from default cache when no local given.
//           await $http({ method: "get", url: "/url" }).then(callback);
//           ;
//           expect(callback).toHaveBeenCalled();
//           expect(callback.calls.mostRecent().args[0].data).toBe(
//             "content-default-cache",
//           );
//           callback.calls.reset();

//           // Serve request from local cache when it is given (but default filled too).
//           await $http({ method: "get", url: "/url", cache: localCache }).then(
//             callback,
//           );
//           ;
//           expect(callback).toHaveBeenCalled();
//           expect(callback.calls.mostRecent().args[0].data).toBe(
//             "content-local-cache",
//           );
//         }));

//         it("should be skipped if {cache: false} is passed in request config", () => {
//           $http.defaults.cache = cache;

//           $httpBackend.expect("GET", "/url").respond(200, "content");
//           await $http({ method: "GET", url: "/url" });
//           $httpBackend.flush();

//           $httpBackend.expect("GET", "/url").respond();
//           await $http({ method: "GET", url: "/url", cache: false });
//           $httpBackend.flush();
//         });
//       });
//     });

//     describe("timeout", () => {
//       it("should abort requests when timeout promise resolves", inject(($q) => {
//         const canceler = $q.defer();

//         $httpBackend.expect("GET", "/some").respond(200);

//         await $http({ method: "GET", url: "/some", timeout: canceler.promise }).catch(
//           (response) => {
//             expect(response.data).toBeUndefined();
//             expect(response.status).toBe(-1);
//             expect(response.xhrStatus).toBe("abort");
//             expect(response.headers()).toEqual(Object.create(null));
//             expect(response.config.url).toBe("/some");
//             callback();
//           },
//         );

//         $rootScope.$apply(() => {
//           canceler.resolve();
//         });

//         expect(callback).toHaveBeenCalled();
//         $httpBackend.verifyNoOutstandingExpectation();
//         $httpBackend.verifyNoOutstandingRequest();
//       }));

//       it("should timeout request when numerical timeout is exceeded", inject((
//         $timeout,
//       ) => {
//         const onFulfilled = jasmine.createSpy("onFulfilled");
//         const onRejected = jasmine
//           .createSpy("onRejected")
//           .and.callFake((response) => {
//             expect(response.xhrStatus).toBe("timeout");
//           });

//         $httpBackend.expect("GET", "/some").respond(200);

//         await $http({
//           method: "GET",
//           url: "/some",
//           timeout: 10,
//         }).then(onFulfilled, onRejected);

//         $timeout.flush(100);

//         expect(onFulfilled).not.toHaveBeenCalled();
//         expect(onRejected).toHaveBeenCalled();
//       }));

//       it("should reject promise when timeout promise resolves", inject((
//         $timeout,
//       ) => {
//         const onFulfilled = jasmine.createSpy("onFulfilled");
//         const onRejected = jasmine
//           .createSpy("onRejected")
//           .and.callFake((response) => {
//             expect(response.xhrStatus).toBe("timeout");
//           });

//         $httpBackend.expect("GET", "/some").respond(200);

//         await $http({
//           method: "GET",
//           url: "/some",
//           timeout: setTimeout(() => {}, 10),
//         }).then(onFulfilled, onRejected);

//         $timeout.flush(100);

//         expect(onFulfilled).not.toHaveBeenCalled();
//         expect(onRejected).toHaveBeenCalled();
//       }));
//     });

//     describe("pendingRequests", () => {
//       it("should be an array of pending requests", () => {
//         $httpBackend.when("GET").respond(200);
//         expect($http.pendingRequests.length).toBe(0);

//         await $http({ method: "get", url: "/some" });
//         ;
//         expect($http.pendingRequests.length).toBe(1);

//         $httpBackend.flush();
//         expect($http.pendingRequests.length).toBe(0);
//       });

//       it("should update pending requests even when served from cache", inject((
//         $rootScope,
//       ) => {
//         $httpBackend.when("GET").respond(200);

//         await $http({ method: "get", url: "/cached", cache: true });
//         await $http({ method: "get", url: "/cached", cache: true });
//         ;
//         expect($http.pendingRequests.length).toBe(2);

//         $httpBackend.flush();
//         expect($http.pendingRequests.length).toBe(0);

//         await $http({ method: "get", url: "/cached", cache: true });
//         spyOn($http.pendingRequests, "push").and.callThrough();
//         ;
//         expect($http.pendingRequests.push).toHaveBeenCalled();

//         await wait();
//         expect($http.pendingRequests.length).toBe(0);
//       }));

//       it("should remove the request before firing callbacks", () => {
//         $httpBackend.when("GET").respond(200);
//         await $http({ method: "get", url: "/url" }).then(() => {
//           expect($http.pendingRequests.length).toBe(0);
//         });

//         ;
//         expect($http.pendingRequests.length).toBe(1);
//         $httpBackend.flush();
//       });
//     });

//     describe("defaults", () => {
//       it("should expose the defaults object at runtime", () => {
//         expect($http.defaults).toBeDefined();

//         $http.defaults.headers.common.foo = "bar";
//         $httpBackend
//           .expect("GET", "/url", undefined, (headers) => headers.foo === "bar")
//           .respond("");

//         $http.get("/url");
//         $httpBackend.flush();
//       });

//       it("should have separate objects for defaults PUT and POST", () => {
//         expect($http.defaults.headers.post).not.toBe(
//           $http.defaults.headers.put,
//         );
//         expect($http.defaults.headers.post).not.toBe(
//           $http.defaults.headers.patch,
//         );
//         expect($http.defaults.headers.put).not.toBe(
//           $http.defaults.headers.patch,
//         );
//       });

//       it("should expose default param serializer at runtime", () => {
//         const { paramSerializer } = $http.defaults;
//         expect(paramSerializer({ foo: "foo", bar: ["bar", "baz"] })).toEqual(
//           "bar=bar&bar=baz&foo=foo",
//         );
//       });
//     });
//   });

//   describe("$browser's outstandingRequestCount", () => {
//     let $http;
//     let $httpBackend;
//     let $rootScope;
//     let incOutstandingRequestCountSpy;
//     let completeOutstandingRequestSpy;

//     describe("without interceptors", () => {
//       beforeEach(setupServicesAndSpies);

//       it("should immediately call `$browser.$$incOutstandingRequestCount()`", () => {
//         expect(incOutstandingRequestCountSpy).not.toHaveBeenCalled();
//         $http.get("");
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//       });

//       it("should call `$browser.$$completeOutstandingRequest()` on success", () => {
//         $httpBackend.when("GET").respond(200);

//         $http.get("");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();
//         $httpBackend.flush();
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });

//       it("should call `$browser.$$completeOutstandingRequest()` on error", () => {
//         $httpBackend.when("GET").respond(500);

//         $http.get("").catch(() => {});
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();
//         $httpBackend.flush();
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });

//       it("should increment/decrement `outstandingRequestCount` on error in `transformRequest`", () => {
//         expect(incOutstandingRequestCountSpy).not.toHaveBeenCalled();
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         $http
//           .get("", {
//             transformRequest() {
//               throw new Error();
//             },
//           })
//           .catch(() => {});

//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         ;

//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });

//       it("should increment/decrement `outstandingRequestCount` on error in `transformResponse`", () => {
//         expect(incOutstandingRequestCountSpy).not.toHaveBeenCalled();
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         $httpBackend.when("GET").respond(200);
//         $http
//           .get("", {
//             transformResponse() {
//               throw new Error();
//             },
//           })
//           .catch(() => {});

//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         $httpBackend.flush();

//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });
//     });

//     describe("with interceptors", () => {
//       let reqInterceptorDeferred;
//       let resInterceptorDeferred;
//       let reqInterceptorFulfilled;
//       let resInterceptorFulfilled;

//       beforeEach(
//         module(($httpProvider) => {
//           reqInterceptorDeferred = null;
//           resInterceptorDeferred = null;
//           reqInterceptorFulfilled = false;
//           resInterceptorFulfilled = false;

//           $httpProvider.interceptors.push(($q) => ({
//             request(config) {
//               return (reqInterceptorDeferred = $q.defer()).promise
//                 .finally(() => {
//                   reqInterceptorFulfilled = true;
//                 })
//                 .then(valueFn(config));
//             },
//             response() {
//               return (resInterceptorDeferred = $q.defer()).promise.finally(
//                 () => {
//                   resInterceptorFulfilled = true;
//                 },
//               );
//             },
//           }));
//         }),
//       );

//       beforeEach(setupServicesAndSpies);

//       beforeEach(() => {
//         $httpBackend.when("GET").respond(200);
//       });

//       it("should increment/decrement `outstandingRequestCount` before/after async interceptors", () => {
//         expect(reqInterceptorFulfilled).toBe(false);
//         expect(resInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).not.toHaveBeenCalled();
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         $http.get("");
//         ;

//         expect(reqInterceptorFulfilled).toBe(false);
//         expect(resInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         reqInterceptorDeferred.resolve();
//         $httpBackend.flush();

//         expect(reqInterceptorFulfilled).toBe(true);
//         expect(resInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         resInterceptorDeferred.resolve();
//         ;

//         expect(reqInterceptorFulfilled).toBe(true);
//         expect(resInterceptorFulfilled).toBe(true);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });

//       it("should increment/decrement `outstandingRequestCount` on error in request interceptor", () => {
//         expect(reqInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).not.toHaveBeenCalled();
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         $http.get("").catch(() => {});
//         ;

//         expect(reqInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         reqInterceptorDeferred.reject();
//         ;

//         expect(reqInterceptorFulfilled).toBe(true);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });

//       it("should increment/decrement `outstandingRequestCount` on error in response interceptor", () => {
//         expect(reqInterceptorFulfilled).toBe(false);
//         expect(resInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).not.toHaveBeenCalled();
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         $http.get("").catch(() => {});
//         ;

//         expect(reqInterceptorFulfilled).toBe(false);
//         expect(resInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         reqInterceptorDeferred.resolve();
//         $httpBackend.flush();

//         expect(reqInterceptorFulfilled).toBe(true);
//         expect(resInterceptorFulfilled).toBe(false);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).not.toHaveBeenCalled();

//         resInterceptorDeferred.reject();
//         ;

//         expect(reqInterceptorFulfilled).toBe(true);
//         expect(resInterceptorFulfilled).toBe(true);
//         expect(incOutstandingRequestCountSpy).toHaveBeenCalledOnceWith("$http");
//         expect(completeOutstandingRequestSpy).toHaveBeenCalledOnceWith(
//           () => {},
//           "$http",
//         );
//       });
//     });

//     // Helpers
//     function setupServicesAndSpies() {
//       inject(($browser, _$http_, _$httpBackend_, _$rootScope_) => {
//         $http = _$http_;
//         $httpBackend = _$httpBackend_;
//         $rootScope = _$rootScope_;

//         incOutstandingRequestCountSpy = spyOn(
//           $browser,
//           "$$incOutstandingRequestCount",
//         ).and.callThrough();
//         completeOutstandingRequestSpy = spyOn(
//           $browser,
//           "$$completeOutstandingRequest",
//         ).and.callThrough();
//       });
//     }
//   });

//   describe("XSRF", () => {
//     let $http;
//     let $httpBackend;

//     beforeEach(
//       module(($httpProvider) => {
//         $httpProvider.xsrfTrustedOrigins.push(
//           "https://trusted.example.com",
//           "https://trusted2.example.com:1337/ignored/path",
//         );
//       }),
//     );

//     beforeEach(inject((_$http_, _$httpBackend_) => {
//       $http = _$http_;
//       $httpBackend = _$httpBackend_;
//     }));

//     it("should set the XSRF cookie into an XSRF header", () => {
//       function checkXsrf(secret, header) {
//         return function checkHeaders(headers) {
//           return headers[header || "X-XSRF-TOKEN"] === secret;
//         };
//       }

//       mockedCookies["XSRF-TOKEN"] = "secret";
//       mockedCookies.aCookie = "secret2";
//       $httpBackend
//         .expect("GET", "/url", null, checkXsrf("secret"))
//         .respond(null);
//       $httpBackend
//         .expect("POST", "/url", null, checkXsrf("secret"))
//         .respond(null);
//       $httpBackend
//         .expect("PUT", "/url", null, checkXsrf("secret"))
//         .respond(null);
//       $httpBackend
//         .expect("DELETE", "/url", null, checkXsrf("secret"))
//         .respond(null);
//       $httpBackend
//         .expect("GET", "/url", null, checkXsrf("secret", "aHeader"))
//         .respond(null);
//       $httpBackend
//         .expect("GET", "/url", null, checkXsrf("secret2"))
//         .respond(null);

//       await $http({ method: "GET", url: "/url" });
//       await $http({ method: "POST", url: "/url", headers: { "S-ome": "Header" } });
//       await $http({ method: "PUT", url: "/url", headers: { Another: "Header" } });
//       await $http({ method: "DELETE", url: "/url", headers: {} });
//       await $http({ method: "GET", url: "/url", xsrfHeaderName: "aHeader" });
//       await $http({ method: "GET", url: "/url", xsrfCookieName: "aCookie" });

//       $httpBackend.flush();
//     });

//     it("should support setting a default XSRF cookie/header name", () => {
//       $http.defaults.xsrfCookieName = "aCookie";
//       $http.defaults.xsrfHeaderName = "aHeader";

//       function checkHeaders(headers) {
//         return headers.aHeader === "secret";
//       }

//       mockedCookies.aCookie = "secret";
//       $httpBackend.expect("GET", "/url", null, checkHeaders).respond(null);

//       $http.get("/url");

//       $httpBackend.flush();
//     });

//     it("should support overriding the default XSRF cookie/header name per request", () => {
//       $http.defaults.xsrfCookieName = "aCookie";
//       $http.defaults.xsrfHeaderName = "aHeader";

//       function checkHeaders(headers) {
//         return headers.anotherHeader === "anotherSecret";
//       }

//       mockedCookies.anotherCookie = "anotherSecret";
//       $httpBackend.expect("GET", "/url", null, checkHeaders).respond(null);

//       $http.get("/url", {
//         xsrfCookieName: "anotherCookie",
//         xsrfHeaderName: "anotherHeader",
//       });

//       $httpBackend.flush();
//     });

//     it("should check the cache before checking the XSRF cookie", inject((
//       $cacheFactory,
//     ) => {
//       function checkHeaders(headers) {
//         return headers["X-XSRF-TOKEN"] === "foo";
//       }
//       function setCookie() {
//         mockedCookies["XSRF-TOKEN"] = "foo";
//       }

//       const testCache = $cacheFactory("testCache");
//       spyOn(testCache, "get").and.callFake(setCookie);

//       $httpBackend.expect("GET", "/url", null, checkHeaders).respond(null);
//       $http.get("/url", { cache: testCache });

//       $httpBackend.flush();
//     }));

//     it("should not set an XSRF header for cross-domain requests", () => {
//       function checkHeaders(headers) {
//         return isUndefined(headers["X-XSRF-TOKEN"]);
//       }
//       const requestUrls = [
//         "https://api.example.com/path",
//         "http://trusted.example.com",
//         "https://trusted2.example.com:1338",
//       ];

//       mockedCookies["XSRF-TOKEN"] = "secret";

//       requestUrls.forEach((url) => {
//         $httpBackend.expect("GET", url, null, checkHeaders).respond(null);
//         $http.get(url);
//         $httpBackend.flush();
//       });
//     });

//     it("should set an XSRF header for cross-domain requests to trusted origins", inject((
//       $browser,
//     ) => {
//       function checkHeaders(headers) {
//         return headers["X-XSRF-TOKEN"] === "secret";
//       }
//       const currentUrl = "https://example.com/path";
//       const requestUrls = [
//         "https://trusted.example.com/path",
//         "https://trusted2.example.com:1337/path",
//       ];

//       $browser.url(currentUrl);
//       mockedCookies["XSRF-TOKEN"] = "secret";

//       requestUrls.forEach((url) => {
//         $httpBackend.expect("GET", url, null, checkHeaders).respond(null);
//         $http.get(url);
//         $httpBackend.flush();
//       });
//     }));
//   });

//   it("should pass timeout, withCredentials and responseType", () => {
//     const $httpBackend = jasmine.createSpy("$httpBackend");

//     $httpBackend.and.callFake(
//       (m, u, d, c, h, timeout, withCredentials, responseType) => {
//         expect(timeout).toBe(12345);
//         expect(withCredentials).toBe(true);
//         expect(responseType).toBe("json");
//       },
//     );

//     module(($provide) => {
//       $provide.value("$httpBackend", $httpBackend);
//     });

//     inject(($http, $rootScope) => {
//       await $http({
//         method: "GET",
//         url: "some.html",
//         timeout: 12345,
//         withCredentials: true,
//         responseType: "json",
//       });
//       ;
//       expect($httpBackend).toHaveBeenCalled();
//     });

//     $httpBackend.verifyNoOutstandingExpectation = () => {};
//   });

//   it("should use withCredentials from default", () => {
//     const $httpBackend = jasmine.createSpy("$httpBackend");

//     $httpBackend.and.callFake(
//       (m, u, d, c, h, timeout, withCredentials, responseType) => {
//         expect(withCredentials).toBe(true);
//       },
//     );

//     module(($provide) => {
//       $provide.value("$httpBackend", $httpBackend);
//     });

//     inject(($http, $rootScope) => {
//       $http.defaults.withCredentials = true;
//       await $http({
//         method: "GET",
//         url: "some.html",
//         timeout: 12345,
//         responseType: "json",
//       });
//       ;
//       expect($httpBackend).toHaveBeenCalled();
//     });

//     $httpBackend.verifyNoOutstandingExpectation = () => {};
//   });
// });

// describe("$http with $applyAsync", () => {
//   let $http;
//   let $httpBackend;
//   let $rootScope;
//   let $browser;
//   let log;

//   beforeEach(inject([
//     "$http",
//     "$httpBackend",
//     "$rootScope",
//     "$browser",
//     "log",
//     function (http, backend, scope, browser, logger) {
//       $http = http;
//       $httpBackend = backend;
//       $rootScope = scope;
//       $browser = browser;
//       spyOn($rootScope, "$apply").and.callThrough();
//       spyOn($rootScope, "$applyAsync").and.callThrough();
//       spyOn($rootScope, "$digest").and.callThrough();
//       spyOn($browser.defer, "cancel").and.callThrough();
//       log = logger;
//     },
//   ]));

//   it("should schedule coalesced apply on response", () => {
//     const handler = jasmine.createSpy("handler");
//     $httpBackend
//       .expect("GET", "/template1.html")
//       .respond(200, "<h1>Header!</h1>", {});
//     $http.get("/template1.html").then(handler);
//     // Ensure requests are sent
//     ;

//     $httpBackend.flush(null, null, false);
//     expect($rootScope.$applyAsync).toHaveBeenCalled();
//     expect(handler).not.toHaveBeenCalled();

//     $browser.defer.flush();
//     expect(handler).toHaveBeenCalled();
//   });

//   it("should combine multiple responses within short time frame into a single $apply", () => {
//     $httpBackend
//       .expect("GET", "/template1.html")
//       .respond(200, "<h1>Header!</h1>", {});
//     $httpBackend
//       .expect("GET", "/template2.html")
//       .respond(200, "<p>Body!</p>", {});

//     $http.get("/template1.html").then(log.fn("response 1"));
//     $http.get("/template2.html").then(log.fn("response 2"));
//     // Ensure requests are sent
//     ;

//     $httpBackend.flush(null, null, false);
//     expect(log).toEqual([]);

//     $browser.defer.flush();
//     expect(log).toEqual(["response 1", "response 2"]);
//   });

//   it("should handle pending responses immediately if a digest occurs on $rootScope", () => {
//     $httpBackend
//       .expect("GET", "/template1.html")
//       .respond(200, "<h1>Header!</h1>", {});
//     $httpBackend
//       .expect("GET", "/template2.html")
//       .respond(200, "<p>Body!</p>", {});
//     $httpBackend
//       .expect("GET", "/template3.html")
//       .respond(200, "<p>Body!</p>", {});

//     $http.get("/template1.html").then(log.fn("response 1"));
//     $http.get("/template2.html").then(log.fn("response 2"));
//     $http.get("/template3.html").then(log.fn("response 3"));
//     // Ensure requests are sent
//     ;

//     // Intermediate $digest occurs before 3rd response is received, assert that pending responses
//     /// are handled
//     $httpBackend.flush(2);
//     expect(log).toEqual(["response 1", "response 2"]);

//     // Finally, third response is received, and a second coalesced $apply is started
//     $httpBackend.flush(null, null, false);
//     $browser.defer.flush();
//     expect(log).toEqual(["response 1", "response 2", "response 3"]);
//   });
// });

// describe("$http param serializers", () => {
//   let defSer;
//   let jqrSer;
//   beforeEach(inject(($httpParamSerializer, $httpParamSerializerJQLike) => {
//     defSer = $httpParamSerializer;
//     jqrSer = $httpParamSerializerJQLike;
//   }));

//   describe("common functionality", () => {
//     it("should return empty string for null or undefined params", () => {
//       expect(defSer(undefined)).toEqual("");
//       expect(jqrSer(undefined)).toEqual("");
//       expect(defSer(null)).toEqual("");
//       expect(jqrSer(null)).toEqual("");
//     });

//     it("should serialize objects", () => {
//       expect(defSer({ foo: "foov", bar: "barv" })).toEqual("bar=barv&foo=foov");
//       expect(jqrSer({ foo: "foov", bar: "barv" })).toEqual("bar=barv&foo=foov");
//       expect(
//         defSer({ someDate: new Date("2014-07-15T17:30:00.000Z") }),
//       ).toEqual("someDate=2014-07-15T17:30:00.000Z");
//       expect(
//         jqrSer({ someDate: new Date("2014-07-15T17:30:00.000Z") }),
//       ).toEqual("someDate=2014-07-15T17:30:00.000Z");
//     });
//   });

//   describe("default array serialization", () => {
//     it("should serialize arrays by repeating param name", () => {
//       expect(defSer({ a: "b", foo: ["bar", "baz"] })).toEqual(
//         "a=b&foo=bar&foo=baz",
//       );
//     });

//     it("should NOT serialize functions", () => {
//       expect(defSer({ foo: "foov", bar() {} })).toEqual("foo=foov");
//     });
//   });

//   describe("jquery array and objects serialization", () => {
//     it("should serialize arrays by repeating param name with [] suffix", () => {
//       expect(jqrSer({ a: "b", foo: ["bar", "baz"] })).toEqual(
//         "a=b&foo%5B%5D=bar&foo%5B%5D=baz",
//       );
//       expect(
//         decodeURIComponent(jqrSer({ a: "b", foo: ["bar", "baz"] })),
//       ).toEqual("a=b&foo[]=bar&foo[]=baz");
//     });

//     it("should serialize arrays with functions", () => {
//       expect(jqrSer({ foo: [valueFn("bar")] })).toEqual("foo%5B%5D=bar"); // foo[]=bar
//     });

//     it("should serialize arrays with functions inside objects", () => {
//       expect(jqrSer({ foo: { bar: [valueFn("baz")] } })).toEqual(
//         "foo%5Bbar%5D%5B%5D=baz",
//       ); // foo[bar][]=baz
//     });

//     it("should serialize objects by repeating param name with [key] suffix", () => {
//       expect(jqrSer({ a: "b", foo: { bar: "barv", baz: "bazv" } })).toEqual(
//         "a=b&foo%5Bbar%5D=barv&foo%5Bbaz%5D=bazv",
//       );
//       // a=b&foo[bar]=barv&foo[baz]=bazv
//     });

//     it("should serialize objects with function properties", () => {
//       expect(jqrSer({ a: valueFn("b") })).toEqual("a=b");
//     });

//     it("should serialize objects with function properties returning an object", () => {
//       expect(jqrSer({ a: valueFn({ b: "c" }) })).toEqual(
//         "a=%7B%22b%22:%22c%22%7D",
//       ); // a={"b":"c"}
//     });

//     it("should serialize nested objects by repeating param name with [key] suffix", () => {
//       expect(
//         jqrSer({ a: ["b", { c: "d" }], e: { f: "g", h: ["i", "j"] } }),
//       ).toEqual(
//         "a%5B%5D=b&a%5B1%5D%5Bc%5D=d&e%5Bf%5D=g&e%5Bh%5D%5B%5D=i&e%5Bh%5D%5B%5D=j",
//       );
//       // a[]=b&a[1][c]=d&e[f]=g&e[h][]=i&e[h][]=j
//     });

//     it("should serialize nested objects with function properties", () => {
//       expect(jqrSer({ foo: { bar: valueFn("barv") } })).toEqual(
//         "foo%5Bbar%5D=barv",
//       ); // foo[bar]=barv
//     });

//     it("should serialize nested objects with function properties returning an object", () => {
//       expect(jqrSer({ foo: { bar: valueFn({ bav: "barv" }) } })).toEqual(
//         "foo%5Bbar%5D=%7B%22bav%22:%22barv%22%7D",
//       ); // foo[bar]={"bav":"barv"}
//     });

//     it("should serialize objects inside array elements using their index", () => {
//       expect(
//         jqrSer({ a: ["b", "c"], d: [{ e: "f", g: "h" }, "i", { j: "k" }] }),
//       ).toEqual(
//         "a%5B%5D=b&a%5B%5D=c&d%5B0%5D%5Be%5D=f&d%5B0%5D%5Bg%5D=h&d%5B%5D=i&d%5B2%5D%5Bj%5D=k",
//       );
//       // a[]=b&a[]=c&d[0][e]=f&d[0][g]=h&d[]=i&d[2][j]=k
//     });
//     it("should serialize `null` and `undefined` elements as empty", () => {
//       expect(
//         jqrSer({
//           items: ["foo", "bar", null, undefined, "baz"],
//           x: null,
//           y: undefined,
//         }),
//       ).toEqual(
//         "items%5B%5D=foo&items%5B%5D=bar&items%5B%5D=&items%5B%5D=&items%5B%5D=baz&x=&y=",
//       );
//       // items[]=foo&items[]=bar&items[]=&items[]=&items[]=baz&x=&y=
//     });
//   });
// });
