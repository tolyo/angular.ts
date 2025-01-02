import { createInjector } from "../../core/di/injector";
import { Angular } from "../../loader";
import { createHttpBackend } from "./http-backend";
import sinon from "sinon";

describe("$httpBackend", () => {
  let $backend;
  let $browser;
  let xhr;
  let callback;
  let requests;
  let angular;

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = function (req) {
      requests.push(req);
    };
    angular = window.angular = new Angular();
    let $injector = createInjector(["ng"]);
    $browser = $injector.get("$browser");
    xhr = sinon.useFakeXMLHttpRequest();
    $backend = createHttpBackend(
      $browser,
      () => new window.XMLHttpRequest(),
      $browser.defer,
    );
    callback = jasmine.createSpy("done");
  });

  afterEach(() => {
    xhr.restore();
  });

  it("should do basics - open async xhr and send data", () => {
    $backend("GET", "/some-url", "some-data", () => {});
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe("GET");
    expect(requests[0].url).toBe("/some-url");
    expect(requests[0].requestBody).toBe("some-data");
    expect(requests[0].async).toBe(true);
  });

  it("should pass null to send if no body is set", () => {
    $backend("GET", "/some-url", undefined, () => {});
    expect(requests[0].requestBody).toBe(null);
  });

  it("should pass the correct falsy value to send if falsy body is set (excluding undefined, NaN)", () => {
    [false, 0, "", null].forEach((value, index) => {
      $backend("GET", "/some-url", value, () => {});
      expect(requests[index].requestBody).toBe(value);
    });
  });

  it("should pass NaN to send if NaN body is set", () => {
    $backend("GET", "/some-url", NaN, () => {});
    expect(isNaN(requests[0].requestBody)).toEqual(true);
  });

  it("should call completion function with xhr.statusText if present", () => {
    callback.and.callFake((status, response, headers, statusText) => {
      expect(statusText).toBe("OK");
    });

    $backend("GET", "/some-url", null, callback);
    requests[0].respond(200);
    expect(callback).toHaveBeenCalled();
  });

  it("should set only the requested headers", () => {
    $backend("POST", "URL", null, () => {}, {
      "X-header1": "value1",
      "X-header2": "value2",
    });
    expect(requests[0].requestHeaders["X-header1"]).toEqual("value1");
    expect(requests[0].requestHeaders["X-header2"]).toEqual("value2");
  });

  it("should not try to read response data when request is aborted", () => {
    callback.and.callFake((status, response, headers, statusText) => {
      expect(status).toBe(-1);
      expect(response).toBe(null);
      expect(headers).toBe(null);
      expect(statusText).toBe("");
    });
    $backend("GET", "/url", null, callback, {}, 2000);
    requests[0].respond(0);
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on abort", () => {
    callback.and.callFake(
      (status, response, headers, statusText, xhrStatus) => {
        expect(status).toBe(-1);
        expect(response).toBe(null);
        expect(headers).toBe(null);
        expect(statusText).toBe("");
      },
    );
    $backend("GET", "/url", null, callback, {});

    expect(callback).not.toHaveBeenCalled();
    requests[0].error();
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on error", () => {
    callback.and.callFake(
      (status, response, headers, statusText, xhrStatus) => {
        expect(status).toBe(-1);
        expect(response).toBe(null);
        expect(headers).toBe(null);
        expect(statusText).toBe("");
        expect(xhrStatus).toBe("error");
      },
    );
    $backend("GET", "/url", null, callback, {});

    expect(callback).not.toHaveBeenCalled();
    requests[0].error();
    expect(callback).toHaveBeenCalled();
  });

  it("should complete the request on success", () => {
    callback.and.callFake(
      (status, response, headers, statusText, xhrStatus) => {
        expect(status).toBe(200);
        expect(response).toBe("response");
        expect(headers).toBe("");
        expect(statusText).toBe("OK");
        expect(xhrStatus).toBe("complete");
      },
    );
    $backend("GET", "/url", null, callback, {});

    expect(callback).not.toHaveBeenCalled();
    requests[0].respond(200, "", "response");
    expect(callback).toHaveBeenCalled();
  });

  // it("should set withCredentials", () => {
  //   $backend("GET", "/some.url", null, callback, {}, null, true);
  //   expect(requests[0].withCredentials).toBeTrue();
  // });

  // it("should abort request on $timeout promise resolution", () => {
  //   callback.and.callFake(
  //     (status, response, headers, statusText, xhrStatus) => {
  //       expect(status).toBe(-1);
  //       expect(xhrStatus).toBe("timeout");
  //     },
  //   );

  //   $backend(
  //     "GET",
  //     "/url",
  //     null,
  //     callback,
  //     {},
  //     setTimeout(() => {}, 2000),
  //   );
  //   spyOn(xhr, "abort");
  //   expect(xhr.abort).toHaveBeenCalled();

  //   requests[0].abort();
  //   expect(callback).toHaveBeenCalled();
  // });

  // it("should not abort resolved request on timeout promise resolution", () => {
  //   callback.and.callFake((status, response) => {
  //     expect(status).toBe(200);
  //   });

  //   $backend(
  //     "GET",
  //     "/url",
  //     null,
  //     callback,
  //     {},
  //     setTimeout(() => {}, 2000),
  //   );
  //   xhr = MockXhr.$$lastInstance;
  //   spyOn(xhr, "abort");

  //   xhr.status = 200;
  //   xhr.onload();
  //   expect(callback).toHaveBeenCalled();

  //   $timeout.flush();
  //   expect(xhr.abort).not.toHaveBeenCalled();
  // });

  // it("should abort request on canceler promise resolution", () => {
  //   const canceler = Promise.withResolvers();

  //   callback.and.callFake(
  //     (status, response, headers, statusText, xhrStatus) => {
  //       expect(status).toBe(-1);
  //       expect(xhrStatus).toBe("abort");
  //     },
  //   );

  //   $backend("GET", "/url", null, callback, {}, canceler.promise);
  //   xhr = MockXhr.$$lastInstance;

  //   canceler.resolve();
  //   $browser.defer.flush();

  //   expect(callback).toHaveBeenCalled();
  // });

  // it("should cancel timeout on completion", () => {
  //   callback.and.callFake((status, response) => {
  //     expect(status).toBe(200);
  //   });

  //   $backend("GET", "/url", null, callback, {}, 2000);
  //   xhr = MockXhr.$$lastInstance;
  //   spyOn(xhr, "abort");

  //   expect($browser.deferredFns[0].time).toBe(2000);

  //   xhr.status = 200;
  //   xhr.onload();
  //   expect(callback).toHaveBeenCalled();

  //   expect($browser.deferredFns.length).toBe(0);
  //   expect(xhr.abort).not.toHaveBeenCalled();
  // });

  // it('should call callback with xhrStatus "abort" on explicit xhr.abort() when $timeout is set', () => {
  //   callback.and.callFake(
  //     (status, response, headers, statusText, xhrStatus) => {
  //       expect(status).toBe(-1);
  //       expect(xhrStatus).toBe("abort");
  //     },
  //   );

  //   $backend(
  //     "GET",
  //     "/url",
  //     null,
  //     callback,
  //     {},
  //     setTimeout(() => {}, 2000),
  //   );
  //   spyOn(xhr, "abort").and.callThrough();

  //   xhr.abort();

  //   expect(callback).toHaveBeenCalled();
  // });

  it("should set up event listeners", () => {
    const progressFn = function () {
      "progressFn";
    };
    $backend("GET", "/url", null, callback, {}, null, null, null, {
      progress: progressFn,
    });
    expect(requests[0].eventListeners.progress[1].listener).toBe(progressFn);
    //expect(requests[0].eventListeners.progress[1].listener).toBe(uploadProgressFn);
  });

  // describe("responseType", () => {
  //   it("should set responseType and return xhr.response", () => {
  //     $backend("GET", "/whatever", null, callback, {}, null, null, "blob");

  //     const xhrInstance = MockXhr.$$lastInstance;
  //     expect(xhrInstance.responseType).toBe("blob");

  //     callback.and.callFake((status, response) => {
  //       expect(response).toBe(xhrInstance.response);
  //     });

  //     xhrInstance.response = { some: "object" };
  //     xhrInstance.onload();

  //     expect(callback).toHaveBeenCalled();
  //   });

  //   it("should read responseText if response was not defined", () => {
  //     //  old browsers like IE9, don't support responseType, so they always respond with responseText

  //     $backend("GET", "/whatever", null, callback, {}, null, null, "blob");

  //     const xhrInstance = MockXhr.$$lastInstance;
  //     const responseText = '{"some": "object"}';
  //     expect(xhrInstance.responseType).toBe("blob");

  //     callback.and.callFake((status, response) => {
  //       expect(response).toBe(responseText);
  //     });

  //     xhrInstance.responseText = responseText;
  //     xhrInstance.onload();

  //     expect(callback).toHaveBeenCalled();
  //   });
  // });

  // describe("protocols that return 0 status code", () => {
  //   function respond(status, content) {
  //     xhr = MockXhr.$$lastInstance;
  //     xhr.status = status;
  //     xhr.responseText = content;
  //     xhr.onload();
  //   }

  //   beforeEach(() => {
  //     $backend = createHttpBackend($browser, createMockXhr);
  //   });

  //   it("should convert 0 to 200 if content and file protocol", () => {
  //     $backend("GET", "file:///whatever/index.html", null, callback);
  //     respond(0, "SOME CONTENT");

  //     expect(callback).toHaveBeenCalled();
  //     expect(callback.calls.mostRecent().args[0]).toBe(200);
  //   });

  //   it("should convert 0 to 200 if content for protocols other than file", () => {
  //     $backend("GET", "someProtocol:///whatever/index.html", null, callback);
  //     respond(0, "SOME CONTENT");

  //     expect(callback).toHaveBeenCalled();
  //     expect(callback.calls.mostRecent().args[0]).toBe(200);
  //   });

  //   it("should convert 0 to 404 if no content and file protocol", () => {
  //     $backend("GET", "file:///whatever/index.html", null, callback);
  //     respond(0, "");

  //     expect(callback).toHaveBeenCalled();
  //     expect(callback.calls.mostRecent().args[0]).toBe(404);
  //   });

  //   it("should not convert 0 to 404 if no content for protocols other than file", () => {
  //     $backend("GET", "someProtocol:///whatever/index.html", null, callback);
  //     respond(0, "");

  //     expect(callback).toHaveBeenCalled();
  //     expect(callback.calls.mostRecent().args[0]).toBe(0);
  //   });

  // it("should convert 0 to 404 if no content - relative url", () => {
  //   /* global urlParsingNode: true */
  //   const originalUrlParsingNode = urlParsingNode;

  //   // temporarily overriding the DOM element to pretend that the test runs origin with file:// protocol
  //   urlParsingNode = {
  //     hash: "#/C:/",
  //     host: "",
  //     hostname: "",
  //     href: "file:///C:/base#!/C:/foo",
  //     pathname: "/C:/foo",
  //     port: "",
  //     protocol: "file:",
  //     search: "",
  //     setAttribute: () => {},
  //   };

  //   try {
  //     $backend("GET", "/whatever/index.html", null, callback);
  //     respond(0, "");

  //     expect(callback).toHaveBeenCalled();
  //     expect(callback.calls.mostRecent().args[0]).toBe(404);
  //   } finally {
  //     urlParsingNode = originalUrlParsingNode;
  //   }
  // });

  // it("should return original backend status code if different from 0", () => {
  //   // request to http://
  //   $backend("POST", "http://rest_api/create_whatever", null, callback);
  //   respond(201, "");

  //   expect(callback).toHaveBeenCalled();
  //   expect(callback.calls.mostRecent().args[0]).toBe(201);

  //   // request to file://
  //   $backend("POST", "file://rest_api/create_whatever", null, callback);
  //   respond(201, "");

  //   expect(callback).toHaveBeenCalled();
  //   expect(callback.calls.mostRecent().args[0]).toBe(201);

  //   // request to file:// with HTTP status >= 300
  //   $backend("POST", "file://rest_api/create_whatever", null, callback);
  //   respond(503, "");

  //   expect(callback).toHaveBeenCalled();
  //   expect(callback.calls.mostRecent().args[0]).toBe(503);
  // });
  // });
});
