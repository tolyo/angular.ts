import { createInjector } from "../di/injector";
import { Angular } from "../../loader";

/**
  http://wiki.commonjs.org/wiki/Promises
  http://www.slideshare.net/domenicdenicola/callbacks-promises-and-coroutines-oh-my-the-evolution-of-asynchronicity-in-javascript

  Q:  https://github.com/kriskowal/q
      https://github.com/kriskowal/q/blob/master/design/README.js
      https://github.com/kriskowal/uncommonjs/blob/master/promises/specification.md
      http://jsconf.eu/2010/speaker/commonjs_i_promise_by_kris_kow.html
        - good walkthrough of the Q api's and design, jump to 15:30

  twisted: http://twistedmatrix.com/documents/11.0.0/api/twisted.internet.defer.Deferred.html
  dojo: https://github.com/dojo/dojo/blob/master/_base/Deferred.js
        http://dojotoolkit.org/api/1.6/dojo/Deferred
        http://dojotoolkit.org/documentation/tutorials/1.6/promises/
  when.js: https://github.com/briancavalier/when.js
  DART: http://www.dartlang.org/docs/api/Promise.html#Promise::Promise
        http://code.google.com/p/dart/source/browse/trunk/dart/corelib/src/promise.dart
        http://codereview.chromium.org/8271014/patch/11003/12005
        https://chromereviews.googleplex.com/3365018/
  WinJS: http://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx

  http://download.oracle.com/javase/1.5.0/docs/api/java/util/concurrent/Future.html
  http://en.wikipedia.org/wiki/Futures_and_promises
  http://wiki.ecmascript.org/doku.php?id=strawman:deferred_functions
  http://wiki.ecmascript.org/doku.php?id=strawman:async_functions


  http://jsperf.com/throw-vs-return
*/

describe("q", () => {
  let $q, $rootScope, $injector;

  beforeEach(() => {
    window.angular = new Angular();
    $injector = createInjector(["ng"]);
    $q = $injector.get("$q");
    $rootScope = $injector.get("$rootScope");
  });

  it("sets up $q", function () {
    window.angular = new Angular();
    var injector = createInjector(["ng"]);
    expect(injector.has("$q")).toBe(true);
  });

  it("has a promise for each Deferred", function () {
    var d = $q.defer();
    expect(d.promise).toBeDefined();
  });

  it("can resolve a promise", function (done) {
    var deferred = $q.defer();
    var promise = deferred.promise;
    var promiseSpy = jasmine.createSpy();
    promise.then(promiseSpy);
    deferred.resolve("a-ok");
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith("a-ok");
      done();
    }, 1);
  });

  it("works when resolved before promise listener", function (done) {
    var d = $q.defer();
    d.resolve(42);
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    setTimeout(function () {
      expect(promiseSpy).toHaveBeenCalledWith(42);
      done();
    }, 0);
  });

  it("does not resolve promise immediately", function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    expect(promiseSpy).not.toHaveBeenCalled();
  });

  it("resolves promise at next digest", function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(promiseSpy).toHaveBeenCalledWith(42);
  });

  it("may only be resolved once", function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    d.resolve(43);
    $rootScope.$apply();
    expect(promiseSpy.calls.count()).toEqual(1);
    expect(promiseSpy).toHaveBeenCalledWith(42);
  });

  it("may only ever be resolved once", function () {
    var d = $q.defer();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(promiseSpy).toHaveBeenCalledWith(42);
    d.resolve(43);
    $rootScope.$apply();
    expect(promiseSpy.calls.count()).toEqual(1);
  });

  it("resolves a listener added after resolution", function () {
    var d = $q.defer();
    d.resolve(42);
    $rootScope.$apply();
    var promiseSpy = jasmine.createSpy();
    d.promise.then(promiseSpy);
    $rootScope.$apply();
    expect(promiseSpy).toHaveBeenCalledWith(42);
  });

  it("may have multiple callbacks", function () {
    var d = $q.defer();
    var firstSpy = jasmine.createSpy();
    var secondSpy = jasmine.createSpy();
    d.promise.then(firstSpy);
    d.promise.then(secondSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(firstSpy).toHaveBeenCalledWith(42);
    expect(secondSpy).toHaveBeenCalledWith(42);
  });

  it("invokes callbacks once", function () {
    var d = $q.defer();
    var firstSpy = jasmine.createSpy();
    var secondSpy = jasmine.createSpy();
    d.promise.then(firstSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(firstSpy.calls.count()).toBe(1);
    expect(secondSpy.calls.count()).toBe(0);
    d.promise.then(secondSpy);
    expect(firstSpy.calls.count()).toBe(1);
    expect(secondSpy.calls.count()).toBe(0);
    $rootScope.$apply();
    expect(firstSpy.calls.count()).toBe(1);
    expect(secondSpy.calls.count()).toBe(1);
  });

  it("can reject a deferred", function () {
    var d = $q.defer();
    var fulfillSpy = jasmine.createSpy();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(fulfillSpy, rejectSpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(fulfillSpy).not.toHaveBeenCalled();
    expect(rejectSpy).toHaveBeenCalledWith("fail");
  });

  it("can reject just once", function () {
    var d = $q.defer();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(null, rejectSpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(rejectSpy.calls.count()).toBe(1);
    d.reject("fail again");
    $rootScope.$apply();
    expect(rejectSpy.calls.count()).toBe(1);
  });

  it("cannot fulfill a promise once rejected", function () {
    var d = $q.defer();
    var fulfillSpy = jasmine.createSpy();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(fulfillSpy, rejectSpy);
    d.reject("fail");
    $rootScope.$apply();
    d.resolve("success");
    $rootScope.$apply();
    expect(fulfillSpy).not.toHaveBeenCalled();
  });

  it("does not require a failure handler each time", function () {
    var d = $q.defer();
    var fulfillSpy = jasmine.createSpy();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(fulfillSpy);
    d.promise.then(null, rejectSpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(rejectSpy).toHaveBeenCalledWith("fail");
  });

  it("does not require a success handler each time", function () {
    var d = $q.defer();
    var fulfillSpy = jasmine.createSpy();
    var rejectSpy = jasmine.createSpy();
    d.promise.then(fulfillSpy);
    d.promise.then(null, rejectSpy);
    d.resolve("ok");
    $rootScope.$apply();
    expect(fulfillSpy).toHaveBeenCalledWith("ok");
  });

  it("can register rejection handler with catch", function () {
    var d = $q.defer();
    var rejectSpy = jasmine.createSpy();
    d.promise.catch(rejectSpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(rejectSpy).toHaveBeenCalled();
  });

  it("invokes a finally handler when fulfilled", function () {
    var d = $q.defer();
    var finallySpy = jasmine.createSpy();
    d.promise.finally(finallySpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(finallySpy).toHaveBeenCalledWith();
  });

  it("invokes a finally handler when rejected", function () {
    var d = $q.defer();
    var finallySpy = jasmine.createSpy();
    d.promise.finally(finallySpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(finallySpy).toHaveBeenCalledWith();
  });

  it("allows chaining handlers", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise
      .then(function (result) {
        return result + 1;
      })
      .then(function (result) {
        return result * 2;
      })
      .then(fulfilledSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(42);
  });

  it("does not modify original resolution in chains", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise
      .then(function (result) {
        return result + 1;
      })
      .then(function (result) {
        return result * 2;
      });
    d.promise.then(fulfilledSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(20);
  });

  it("catches rejection on chained handler", function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(() => {}).catch(rejectedSpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("fulfills on chained handler", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise.catch(() => {}).then(fulfilledSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(42);
  });

  it("treats catch return value as resolution", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise
      .catch(function () {
        return 42;
      })
      .then(fulfilledSpy);
    d.reject("fail");
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(42);
  });

  it("rejects chained promise when handler throws", function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise
      .then(function () {
        throw "fail";
      })
      .catch(rejectedSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("does not reject current promise when handler throws", function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise.then(function () {
      throw "fail";
    });
    d.promise.catch(rejectedSpy);
    d.resolve(42);
    $rootScope.$apply();
    expect(rejectedSpy).not.toHaveBeenCalled();
  });

  it("waits on promise returned from handler", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise
      .then(function (v) {
        var d2 = $q.defer();
        d2.resolve(v + 1);
        return d2.promise;
      })
      .then(function (v) {
        return v * 2;
      })
      .then(fulfilledSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(42);
  });

  it("waits on promise given to resolve", function () {
    var d = $q.defer();
    var d2 = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise.then(fulfilledSpy);
    d2.resolve(42);
    d.resolve(d2.promise);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(42);
  });

  it("rejects when promise returned from handler rejects", function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise
      .then(function () {
        var d2 = $q.defer();
        d2.reject("fail");
        return d2.promise;
      })
      .catch(rejectedSpy);
    d.resolve("ok");
    $rootScope.$apply();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("allows chaining handlers on finally, with original value", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    d.promise
      .then(function (result) {
        return result + 1;
      })
      .finally(function (result) {
        return result * 2;
      })
      .then(fulfilledSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(21);
  });

  it("allows chaining handlers on finally, with original rejection", function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    d.promise
      .then(function (result) {
        throw "fail";
      })
      .finally(function () {})
      .catch(rejectedSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("resolves to orig value when nested promise resolves", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    var resolveNested;
    d.promise
      .then(function (result) {
        return result + 1;
      })
      .finally(function (result) {
        var d2 = $q.defer();
        resolveNested = function () {
          d2.resolve("abc");
        };
        return d2.promise;
      })
      .then(fulfilledSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
    resolveNested();
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith(21);
  });

  it("rejects to original value when nested promise resolves", function () {
    var d = $q.defer();
    var rejectedSpy = jasmine.createSpy();
    var resolveNested;
    d.promise
      .then(function (result) {
        throw "fail";
      })
      .finally(function (result) {
        var d2 = $q.defer();
        resolveNested = function () {
          d2.resolve("abc");
        };
        return d2.promise;
      })
      .catch(rejectedSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(rejectedSpy).not.toHaveBeenCalled();
    resolveNested();
    $rootScope.$apply();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("rejects when nested promise rejects in finally", function () {
    var d = $q.defer();
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    var rejectNested;
    d.promise
      .then(function (result) {
        return result + 1;
      })
      .finally(function (result) {
        var d2 = $q.defer();
        rejectNested = function () {
          d2.reject("fail");
        };
        return d2.promise;
      })
      .then(fulfilledSpy, rejectedSpy);
    d.resolve(20);
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
    rejectNested();
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("can make an immediately rejected promise", function () {
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    var promise = $q.reject("fail");
    promise.then(fulfilledSpy, rejectedSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("can make an immediately resolved promise", function () {
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    var promise = $q.resolve("ok");
    promise.then(fulfilledSpy, rejectedSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith("ok");
    expect(rejectedSpy).not.toHaveBeenCalled();
  });

  it("can wrap a foreign promise", function () {
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    var promise = $q.resolve({
      then: function (handler) {
        $rootScope.$evalAsync(function () {
          handler("ok");
        });
      },
    });
    promise.then(fulfilledSpy, rejectedSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith("ok");
    expect(rejectedSpy).not.toHaveBeenCalled();
  });

  it("takes callbacks directly when wrapping", function () {
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    var wrapped = $q.defer();
    $q.resolve(wrapped.promise, fulfilledSpy, rejectedSpy);
    wrapped.resolve("ok");
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith("ok");
    expect(rejectedSpy).not.toHaveBeenCalled();
  });

  it("makes an immediately resolved promise with resolve", function () {
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    var promise = $q.resolve("ok");
    promise.then(fulfilledSpy, rejectedSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith("ok");
    expect(rejectedSpy).not.toHaveBeenCalled();
  });
});

describe("all", function () {
  let $q, $rootScope, $injector;

  beforeEach(() => {
    window.angular = new Angular();
    $injector = createInjector(["ng"]);
    $q = $injector.get("$q");
    $rootScope = $injector.get("$rootScope");
  });

  it("can resolve an array of promises to array of results", function () {
    var promise = $q.all([$q.resolve(1), $q.resolve(2), $q.resolve(3)]);
    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("can resolve an object of promises to an object of results", function () {
    var promise = $q.all({ a: $q.resolve(1), b: $q.resolve(2) });
    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith({ a: 1, b: 2 });
  });

  it("resolves an empty array of promises immediately", function () {
    var promise = $q.all([]);
    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith([]);
  });

  it("resolves an empty object of promises immediately", function () {
    var promise = $q.all({});
    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith({});
  });

  it("rejects when any of the promises rejects", function () {
    var promise = $q.all([$q.resolve(1), $q.resolve(2), $q.reject("fail")]);
    var fulfilledSpy = jasmine.createSpy();
    var rejectedSpy = jasmine.createSpy();
    promise.then(fulfilledSpy, rejectedSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).not.toHaveBeenCalled();
    expect(rejectedSpy).toHaveBeenCalledWith("fail");
  });

  it("wraps non-promises in the input collection", function () {
    var promise = $q.all([$q.resolve(1), 2, 3]);
    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);
    $rootScope.$apply();
    expect(fulfilledSpy).toHaveBeenCalledWith([1, 2, 3]);
  });

  describe("all", function () {
    let $q, $rootScope, $injector;

    beforeEach(() => {
      window.angular = new Angular();
      $injector = createInjector(["ng"]);
      $q = $injector.get("$q");
      $rootScope = $injector.get("$rootScope");
    });

    it("is a function", function () {
      expect($q instanceof Function).toBe(true);
    });

    it("expects a function as an argument", function () {
      expect($q).toThrow();
      $q(() => {}); // Just checking that this doesn't throw
    });

    it("returns a promise", function () {
      expect($q(() => {})).toBeDefined();
      expect($q(() => {}).then).toBeDefined();
    });

    it("calls function with a resolve function", function () {
      var fulfilledSpy = jasmine.createSpy();
      $q(function (resolve) {
        resolve("ok");
      }).then(fulfilledSpy);
      $rootScope.$apply();
      expect(fulfilledSpy).toHaveBeenCalledWith("ok");
    });
  });

  describe("$Q", () => {
    let resolve;
    let reject;
    let resolve2;
    let reject2;

    const createPromise = function () {
      return $q((resolveFn, rejectFn) => {
        if (resolve === null) {
          resolve = resolveFn;
          reject = rejectFn;
        } else if (resolve2 === null) {
          resolve2 = resolveFn;
          reject2 = rejectFn;
        }
      });
    };

    afterEach(() => {
      resolve = reject = resolve2 = reject2 = null;
    });

    it("should return a Promise", () => {
      const promise = $q(() => {});
      expect(typeof promise.then).toBe("function");
      expect(typeof promise.catch).toBe("function");
      expect(typeof promise.finally).toBe("function");
    });

    // it("should support the instanceof operator", () => {
    //   let promise = $q(() => {});
    //   expect(promise instanceof $q).toBe(true);
    //   promise = new $q(() => {});
    //   expect(promise instanceof $q).toBe(true);
    // });

    // describe("resolve", () => {
    //   it("should fulfill the promise and execute all success callbacks in the registration order", () => {
    //     const promise = createPromise();
    //     promise.then(success(1), error());
    //     promise.then(success(2), error());
    //     expect(logStr()).toBe("");

    //     resolve("foo");
    //     mockNextTick.flush();
    //     expect(logStr()).toBe("success1(foo)->foo; success2(foo)->foo");
    //   });
    // });
  });

  //     it("should do nothing if a promise was previously resolved", () => {
  //       const promise = createPromise();
  //       promise.then(success(), error());
  //       expect(logStr()).toBe("");

  //       resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(foo)->foo");

  //       log = [];
  //       resolve("bar");
  //       reject("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");
  //     });

  //     it("should do nothing if a promise was previously rejected", () => {
  //       const promise = createPromise();
  //       promise.then(success(), error());
  //       expect(logStr()).toBe("");

  //       reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(foo)->reject(foo)");

  //       log = [];
  //       resolve("bar");
  //       reject("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");
  //     });

  //     it("should allow deferred resolution with a new promise", () => {
  //       const promise = createPromise();

  //       promise.then(success(), error());

  //       resolve(createPromise());
  //       expect(logStr()).toBe("");

  //       resolve2("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(foo)->foo");
  //     });

  //     it("should call the callback in the next turn", () => {
  //       const promise = createPromise();
  //       promise.then(success());
  //       expect(logStr()).toBe("");

  //       resolve("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(foo)->foo");
  //     });

  //     it("should not break if a callbacks registers another callback", () => {
  //       const promise = createPromise();
  //       promise.then(() => {
  //         log.push("outer");
  //         promise.then(() => {
  //           log.push("inner");
  //         });
  //       });

  //       resolve("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("outer; inner");
  //     });

  //     it("should not break if a callbacks tries to resolve the deferred again", () => {
  //       const promise = createPromise();
  //       promise.then((val) => {
  //         log.push(`then1(${val})->resolve(bar)`);
  //         deferred.resolve("bar"); // nop
  //       });

  //       promise.then(success(2));

  //       resolve("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("then1(foo)->resolve(bar); success2(foo)->foo");
  //     });
  //   });

  //   describe("reject", () => {
  //     it("should reject the promise and execute all error callbacks in the registration order", () => {
  //       const promise = createPromise();
  //       promise.then(success(), error(1));
  //       promise.then(success(), error(2));
  //       expect(logStr()).toBe("");

  //       reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "error1(foo)->reject(foo); error2(foo)->reject(foo)",
  //       );
  //     });

  //     it("should do nothing if a promise was previously resolved", () => {
  //       const promise = createPromise();
  //       promise.then(success(1), error(1));
  //       expect(logStr()).toBe("");

  //       resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success1(foo)->foo");

  //       log = [];
  //       reject("bar");
  //       resolve("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");

  //       promise.then(success(2), error(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success2(foo)->foo");
  //     });

  //     it("should do nothing if a promise was previously rejected", () => {
  //       const promise = createPromise();
  //       promise.then(success(1), error(1));
  //       expect(logStr()).toBe("");

  //       reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error1(foo)->reject(foo)");

  //       log = [];
  //       reject("bar");
  //       resolve("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");

  //       promise.then(success(2), error(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error2(foo)->reject(foo)");
  //     });

  //     it("should not defer rejection with a new promise", () => {
  //       const promise = createPromise();
  //       promise.then(success(), error());

  //       reject(createPromise());
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error({})->reject({})");
  //     });

  //     it("should call the error callback in the next turn", () => {
  //       const promise = createPromise();
  //       promise.then(success(), error());
  //       expect(logStr()).toBe("");

  //       reject("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(foo)->reject(foo)");
  //     });

  //     it("should support non-bound execution", () => {
  //       const promise = createPromise();
  //       promise.then(success(), error());
  //       reject("detached");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(detached)->reject(detached)");
  //     });
  //   });

  //   describe("promise", () => {
  //     describe("then", () => {
  //       it(
  //         "should allow registration of a success callback without an errback or progressBack " +
  //           "and resolve",
  //         () => {
  //           const promise = createPromise();
  //           promise.then(success());
  //           resolve("foo");
  //           mockNextTick.flush();
  //           expect(logStr()).toBe("success(foo)->foo");
  //         },
  //       );

  //       it("should allow registration of a success callback without an errback and reject", () => {
  //         const promise = createPromise();
  //         promise.then(success());
  //         reject("foo");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("");
  //       });

  //       it(
  //         "should allow registration of an errback without a success or progress callback and " +
  //           " reject",
  //         () => {
  //           const promise = createPromise();
  //           promise.then(null, error());
  //           reject("oops!");
  //           mockNextTick.flush();
  //           expect(logStr()).toBe("error(oops!)->reject(oops!)");
  //         },
  //       );

  //       it("should allow registration of an errback without a success callback and resolve", () => {
  //         const promise = createPromise();
  //         promise.then(null, error());
  //         resolve("done");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("");
  //       });

  //       it("should allow registration of a progressBack without a success callback and resolve", () => {
  //         const promise = createPromise();
  //         promise.then(null, null, progress());
  //         resolve("done");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("");
  //       });

  //       it("should allow registration of a progressBack without a error callback and reject", () => {
  //         const promise = createPromise();
  //         promise.then(null, null, progress());
  //         reject("oops!");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("");
  //       });

  //       it("should resolve all callbacks with the original value", () => {
  //         const promise = createPromise();
  //         promise.then(success("A", "aVal"), error(), progress());
  //         promise.then(success("B", "bErr", true), error(), progress());
  //         promise.then(success("C", q.reject("cReason")), error(), progress());
  //         promise.then(
  //           success("D", q.reject("dReason"), true),
  //           error(),
  //           progress(),
  //         );
  //         promise.then(success("E", "eVal"), error(), progress());

  //         expect(logStr()).toBe("");
  //         resolve("yup");
  //         mockNextTick.flush();
  //         expect(log).toEqual([
  //           "successA(yup)->aVal",
  //           "successB(yup)->throw(bErr)",
  //           "successC(yup)->{}",
  //           "successD(yup)->throw({})",
  //           "successE(yup)->eVal",
  //         ]);
  //       });

  //       it("should reject all callbacks with the original reason", () => {
  //         const promise = createPromise();
  //         promise.then(success(), error("A", "aVal"), progress());
  //         promise.then(success(), error("B", "bEr", true), progress());
  //         promise.then(success(), error("C", q.reject("cReason")), progress());
  //         promise.then(success(), error("D", "dVal"), progress());

  //         expect(logStr()).toBe("");
  //         reject("noo!");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "errorA(noo!)->aVal; errorB(noo!)->throw(bEr); errorC(noo!)->{}; errorD(noo!)->dVal",
  //         );
  //       });

  //       it("should propagate resolution and rejection between dependent promises", () => {
  //         const promise = createPromise();
  //         promise
  //           .then(success(1, "x"), error("1"))
  //           .then(success(2, "y", true), error("2"))
  //           .then(success(3), error(3, "z", true))
  //           .then(success(4), error(4, "done"))
  //           .then(success(5), error(5));

  //         expect(logStr()).toBe("");
  //         resolve("sweet!");
  //         mockNextTick.flush();
  //         expect(log).toEqual([
  //           "success1(sweet!)->x",
  //           "success2(x)->throw(y)",
  //           "error3(y)->throw(z)",
  //           "error4(z)->done",
  //           "success5(done)->done",
  //         ]);
  //       });

  //       it("should reject a derived promise if an exception is thrown while resolving its parent", () => {
  //         const promise = createPromise();
  //         promise
  //           .then(success(1, "oops", true), error(1))
  //           .then(success(2), error(2));
  //         resolve("done!");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "success1(done!)->throw(oops); error2(oops)->reject(oops)",
  //         );
  //       });

  //       it("should reject a derived promise if an exception is thrown while rejecting its parent", () => {
  //         const promise = createPromise();
  //         promise.then(null, error(1, "oops", true)).then(success(2), error(2));
  //         reject("timeout");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "error1(timeout)->throw(oops); error2(oops)->reject(oops)",
  //         );
  //       });

  //       it("should call success callback in the next turn even if promise is already resolved", () => {
  //         const promise = createPromise();
  //         resolve("done!");

  //         promise.then(success());
  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["success(done!)->done!"]);
  //       });

  //       it("should call error callback in the next turn even if promise is already rejected", () => {
  //         const promise = createPromise();
  //         reject("oops!");

  //         promise.then(null, error());
  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["error(oops!)->reject(oops!)"]);
  //       });

  //       it("should forward success resolution when success callbacks are not functions", () => {
  //         const promise = createPromise();
  //         resolve("yay!");

  //         promise
  //           .then(1)
  //           .then(null)
  //           .then({})
  //           .then("gah!")
  //           .then([])
  //           .then(success());

  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["success(yay!)->yay!"]);
  //       });

  //       it("should forward error resolution when error callbacks are not functions", () => {
  //         const promise = createPromise();
  //         reject("oops!");

  //         promise
  //           .then(null, 1)
  //           .then(null, null)
  //           .then(null, {})
  //           .then(null, "gah!")
  //           .then(null, [])
  //           .then(null, error());

  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["error(oops!)->reject(oops!)"]);
  //       });
  //     });

  //     describe("finally", () => {
  //       it("should not take an argument", () => {
  //         const promise = createPromise();
  //         promise.finally(fin(1));
  //         resolve("foo");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("finally1()");
  //       });

  //       describe("when the promise is fulfilled", () => {
  //         it("should call the callback", () => {
  //           const promise = createPromise();
  //           promise.then(success(1)).finally(fin(1));
  //           resolve("foo");
  //           mockNextTick.flush();
  //           expect(logStr()).toBe("success1(foo)->foo; finally1()");
  //         });

  //         it("should fulfill with the original value", () => {
  //           const promise = createPromise();
  //           promise
  //             .finally(fin("B", "b"), error("B"))
  //             .then(success("BB", "bb"), error("BB"));
  //           resolve("RESOLVED_VAL");
  //           mockNextTick.flush();
  //           expect(log).toEqual([
  //             "finallyB()->b",
  //             "successBB(RESOLVED_VAL)->bb",
  //           ]);
  //         });

  //         it("should fulfill with the original value (larger test)", () => {
  //           const promise = createPromise();
  //           promise.then(success("A", "a"), error("A"));
  //           promise
  //             .finally(fin("B", "b"), error("B"))
  //             .then(success("BB", "bb"), error("BB"));
  //           promise
  //             .then(success("C", "c"), error("C"))
  //             .finally(fin("CC", "IGNORED"))
  //             .then(success("CCC", "cc"), error("CCC"))
  //             .then(success("CCCC", "ccc"), error("CCCC"));
  //           resolve("RESOLVED_VAL");
  //           mockNextTick.flush();

  //           expect(log).toEqual([
  //             "successA(RESOLVED_VAL)->a",
  //             "finallyB()->b",
  //             "successC(RESOLVED_VAL)->c",
  //             "finallyCC()->IGNORED",
  //             "successBB(RESOLVED_VAL)->bb",
  //             "successCCC(c)->cc",
  //             "successCCCC(cc)->ccc",
  //           ]);
  //         });

  //         describe("when the callback returns a promise", () => {
  //           describe("that is fulfilled", () => {
  //             it("should fulfill with the original reason after that promise resolves", () => {
  //               const promise = createPromise();
  //               const promise2 = createPromise();
  //               resolve2("bar");

  //               promise.finally(fin(1, promise)).then(success(2));

  //               resolve("foo");
  //               mockNextTick.flush();

  //               expect(logStr()).toBe("finally1()->{}; success2(foo)->foo");
  //             });
  //           });

  //           describe("that is rejected", () => {
  //             it("should reject with this new rejection reason", () => {
  //               const promise = createPromise();
  //               const promise2 = createPromise();
  //               reject2("bar");
  //               promise.finally(fin(1, promise2)).then(success(2), error(1));
  //               resolve("foo");
  //               mockNextTick.flush();
  //               expect(logStr()).toBe(
  //                 "finally1()->{}; error1(bar)->reject(bar)",
  //               );
  //             });
  //           });
  //         });

  //         describe("when the callback throws an exception", () => {
  //           it("should reject with this new exception", () => {
  //             const promise = createPromise();
  //             promise
  //               .finally(fin(1, "exception", true))
  //               .then(success(1), error(2));
  //             resolve("foo");
  //             mockNextTick.flush();
  //             expect(logStr()).toBe(
  //               "finally1()->throw(exception); error2(exception)->reject(exception)",
  //             );
  //           });
  //         });
  //       });

  //       describe("when the promise is rejected", () => {
  //         it("should call the callback", () => {
  //           const promise = createPromise();
  //           promise.finally(fin(1)).then(success(2), error(1));
  //           reject("foo");
  //           mockNextTick.flush();
  //           expect(logStr()).toBe("finally1(); error1(foo)->reject(foo)");
  //         });

  //         it("should reject with the original reason", () => {
  //           const promise = createPromise();
  //           promise.finally(fin(1), "hello").then(success(2), error(2));
  //           reject("original");
  //           mockNextTick.flush();
  //           expect(logStr()).toBe(
  //             "finally1(); error2(original)->reject(original)",
  //           );
  //         });

  //         describe("when the callback returns a promise", () => {
  //           describe("that is fulfilled", () => {
  //             it("should reject with the original reason after that promise resolves", () => {
  //               const promise = createPromise();
  //               const promise2 = createPromise();
  //               resolve2("bar");
  //               promise.finally(fin(1, promise2)).then(success(2), error(2));
  //               reject("original");
  //               mockNextTick.flush();
  //               expect(logStr()).toBe(
  //                 "finally1()->{}; error2(original)->reject(original)",
  //               );
  //             });
  //           });

  //           describe("that is rejected", () => {
  //             it("should reject with the new reason", () => {
  //               const promise = createPromise();
  //               const promise2 = createPromise();
  //               reject2("bar");
  //               promise.finally(fin(1, promise2)).then(success(2), error(1));
  //               resolve("foo");
  //               mockNextTick.flush();
  //               expect(logStr()).toBe(
  //                 "finally1()->{}; error1(bar)->reject(bar)",
  //               );
  //             });
  //           });
  //         });

  //         describe("when the callback throws an exception", () => {
  //           it("should reject with this new exception", () => {
  //             const promise = createPromise();
  //             promise
  //               .finally(fin(1, "exception", true))
  //               .then(success(1), error(2));
  //             resolve("foo");
  //             mockNextTick.flush();
  //             expect(logStr()).toBe(
  //               "finally1()->throw(exception); error2(exception)->reject(exception)",
  //             );
  //           });
  //         });
  //       });
  //     });

  //     describe("catch", () => {
  //       it("should be a shorthand for defining promise error handlers", () => {
  //         const promise = createPromise();
  //         promise.catch(error(1)).then(null, error(2));
  //         reject("foo");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "error1(foo)->reject(foo); error2(foo)->reject(foo)",
  //         );
  //       });
  //     });
  //   });
  // });

  // describe("defer", () => {
  //   it("should create a new deferred", () => {
  //     expect(deferred.promise).toBeDefined();
  //     expect(deferred.resolve).toBeDefined();
  //     expect(deferred.reject).toBeDefined();
  //   });

  //   describe("resolve", () => {
  //     it("should fulfill the promise and execute all success callbacks in the registration order", () => {
  //       promise.then(success(1), error());
  //       promise.then(success(2), error());
  //       expect(logStr()).toBe("");

  //       deferred.resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success1(foo)->foo; success2(foo)->foo");
  //     });

  //     it("should complain if promise fulfilled with itself", () => {
  //       const resolveSpy = jasmine.createSpy("resolve");
  //       const rejectSpy = jasmine.createSpy("reject");
  //       promise.then(resolveSpy, rejectSpy);
  //       deferred.resolve(deferred.promise);
  //       mockNextTick.flush();

  //       expect(resolveSpy).not.toHaveBeenCalled();
  //       expect(rejectSpy).toHaveBeenCalled();
  //       expect(rejectSpy.calls.argsFor(0)[0]).toEqualMinErr(
  //         "$q",
  //         "qcycle",
  //         "Expected promise to be resolved with value other than itself",
  //       );
  //     });

  //     it("should do nothing if a promise was previously resolved", () => {
  //       promise.then(success(), error());
  //       expect(logStr()).toBe("");

  //       deferred.resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(foo)->foo");

  //       log = [];
  //       deferred.resolve("bar");
  //       deferred.reject("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");
  //     });

  //     it("should do nothing if a promise was previously rejected", () => {
  //       promise.then(success(), error());
  //       expect(logStr()).toBe("");

  //       deferred.reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(foo)->reject(foo)");

  //       log = [];
  //       deferred.resolve("bar");
  //       deferred.reject("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");
  //     });

  //     it("should allow deferred resolution with a new promise", () => {
  //       const deferred2 = defer();
  //       promise.then(success(), error());

  //       deferred.resolve(deferred2.promise);
  //       expect(logStr()).toBe("");

  //       deferred2.resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(foo)->foo");
  //     });

  //     it("should call the callback in the next turn", () => {
  //       promise.then(success());
  //       expect(logStr()).toBe("");

  //       deferred.resolve("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(foo)->foo");
  //     });

  //     it("should support non-bound execution", () => {
  //       const resolver = deferred.resolve;
  //       promise.then(success(), error());
  //       resolver("detached");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(detached)->detached");
  //     });

  //     it("should not break if a callbacks registers another callback", () => {
  //       promise.then(() => {
  //         log.push("outer");
  //         promise.then(() => {
  //           log.push("inner");
  //         });
  //       });

  //       deferred.resolve("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("outer; inner");
  //     });

  //     it("should not break if a callbacks tries to resolve the deferred again", () => {
  //       promise.then((val) => {
  //         log.push(`then1(${val})->resolve(bar)`);
  //         deferred.resolve("bar"); // nop
  //       });

  //       promise.then(success(2));

  //       deferred.resolve("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("then1(foo)->resolve(bar); success2(foo)->foo");
  //     });
  //   });

  //   describe("reject", () => {
  //     it("should reject the promise and execute all error callbacks in the registration order", () => {
  //       promise.then(success(), error(1));
  //       promise.then(success(), error(2));
  //       expect(logStr()).toBe("");

  //       deferred.reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "error1(foo)->reject(foo); error2(foo)->reject(foo)",
  //       );
  //     });

  //     it("should do nothing if a promise was previously resolved", () => {
  //       promise.then(success(1), error(1));
  //       expect(logStr()).toBe("");

  //       deferred.resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success1(foo)->foo");

  //       log = [];
  //       deferred.reject("bar");
  //       deferred.resolve("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");

  //       promise.then(success(2), error(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success2(foo)->foo");
  //     });

  //     it("should do nothing if a promise was previously rejected", () => {
  //       promise.then(success(1), error(1));
  //       expect(logStr()).toBe("");

  //       deferred.reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error1(foo)->reject(foo)");

  //       log = [];
  //       deferred.reject("bar");
  //       deferred.resolve("baz");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");

  //       promise.then(success(2), error(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error2(foo)->reject(foo)");
  //     });

  //     it("should not defer rejection with a new promise", () => {
  //       const deferred2 = defer();
  //       promise.then(success(), error());

  //       deferred.reject(deferred2.promise);
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error({})->reject({})");
  //     });

  //     it("should call the error callback in the next turn", () => {
  //       promise.then(success(), error());
  //       expect(logStr()).toBe("");

  //       deferred.reject("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(foo)->reject(foo)");
  //     });

  //     it("should support non-bound execution", () => {
  //       const rejector = deferred.reject;
  //       promise.then(success(), error());
  //       rejector("detached");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(detached)->reject(detached)");
  //     });
  //   });

  //   describe("notify", () => {
  //     it("should execute all progress callbacks in the registration order", () => {
  //       promise.then(success(1), error(1), progress(1));
  //       promise.then(success(2), error(2), progress(2));
  //       expect(logStr()).toBe("");

  //       deferred.notify("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("progress1(foo)->foo; progress2(foo)->foo");
  //     });

  //     it("should do nothing if a promise was previously resolved", () => {
  //       promise.then(success(1), error(1), progress(1));
  //       expect(logStr()).toBe("");

  //       deferred.resolve("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success1(foo)->foo");

  //       log = [];
  //       deferred.notify("bar");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");
  //     });

  //     it("should do nothing if a promise was previously rejected", () => {
  //       promise.then(success(1), error(1), progress(1));
  //       expect(logStr()).toBe("");

  //       deferred.reject("foo");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error1(foo)->reject(foo)");

  //       log = [];
  //       deferred.reject("bar");
  //       deferred.resolve("baz");
  //       deferred.notify("qux");
  //       expect(mockNextTick.queue.length).toBe(0);
  //       expect(logStr()).toBe("");

  //       promise.then(success(2), error(2), progress(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error2(foo)->reject(foo)");
  //     });

  //     it("should not apply any special treatment to promises passed to notify", () => {
  //       const deferred2 = defer();
  //       promise.then(success(), error(), progress());

  //       deferred.notify(deferred2.promise);
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("progress({})->{}");
  //     });

  //     it("should call the progress callbacks in the next turn", () => {
  //       promise.then(success(), error(), progress(1));
  //       promise.then(success(), error(), progress(2));
  //       expect(logStr()).toBe("");

  //       deferred.notify("foo");
  //       expect(logStr()).toBe("");

  //       mockNextTick.flush();
  //       expect(logStr()).toBe("progress1(foo)->foo; progress2(foo)->foo");
  //     });

  //     it("should ignore notifications sent out in the same turn before listener registration", () => {
  //       deferred.notify("foo");
  //       promise.then(success(), error(), progress(1));
  //       expect(logStr()).toBe("");
  //       expect(mockNextTick.queue).toEqual([]);
  //     });

  //     it("should support non-bound execution", () => {
  //       const { notify } = deferred;
  //       promise.then(success(), error(), progress());
  //       notify("detached");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("progress(detached)->detached");
  //     });

  //     it("should not save and re-emit progress notifications between ticks", () => {
  //       promise.then(success(1), error(1), progress(1));
  //       deferred.notify("foo");
  //       deferred.notify("bar");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("progress1(foo)->foo; progress1(bar)->bar");

  //       log = [];
  //       promise.then(success(2), error(2), progress(2));
  //       deferred.notify("baz");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("progress1(baz)->baz; progress2(baz)->baz");
  //     });
  //   });

  //   describe("promise", () => {
  //     it("should have a then method", () => {
  //       expect(typeof promise.then).toBe("function");
  //     });

  //     it("should have a catch method", () => {
  //       expect(typeof promise.catch).toBe("function");
  //     });

  //     it("should have a finally method", () => {
  //       expect(typeof promise.finally).toBe("function");
  //     });

  //     describe("then", () => {
  //       it(
  //         "should allow registration of a success callback without an errback or progressBack " +
  //           "and resolve",
  //         () => {
  //           promise.then(success());
  //           syncResolve(deferred, "foo");
  //           expect(logStr()).toBe("success(foo)->foo");
  //         },
  //       );

  //       it("should allow registration of a success callback without an errback and reject", () => {
  //         promise.then(success());
  //         syncReject(deferred, "foo");
  //         expect(logStr()).toBe("");
  //       });

  //       it("should allow registration of a success callback without a progressBack and notify", () => {
  //         promise.then(success());
  //         syncNotify(deferred, "doing");
  //         expect(logStr()).toBe("");
  //       });

  //       it(
  //         "should allow registration of an errback without a success or progress callback and " +
  //           " reject",
  //         () => {
  //           promise.then(null, error());
  //           syncReject(deferred, "oops!");
  //           expect(logStr()).toBe("error(oops!)->reject(oops!)");
  //         },
  //       );

  //       it("should allow registration of an errback without a success callback and resolve", () => {
  //         promise.then(null, error());
  //         syncResolve(deferred, "done");
  //         expect(logStr()).toBe("");
  //       });

  //       it("should allow registration of an errback without a progress callback and notify", () => {
  //         promise.then(null, error());
  //         syncNotify(deferred, "doing");
  //         expect(logStr()).toBe("");
  //       });

  //       it(
  //         "should allow registration of a progressBack without a success or error callback and " +
  //           "notify",
  //         () => {
  //           promise.then(null, null, progress());
  //           syncNotify(deferred, "doing");
  //           expect(logStr()).toBe("progress(doing)->doing");
  //         },
  //       );

  //       it("should allow registration of a progressBack without a success callback and resolve", () => {
  //         promise.then(null, null, progress());
  //         syncResolve(deferred, "done");
  //         expect(logStr()).toBe("");
  //       });

  //       it("should allow registration of a progressBack without a error callback and reject", () => {
  //         promise.then(null, null, progress());
  //         syncReject(deferred, "oops!");
  //         expect(logStr()).toBe("");
  //       });

  //       it("should resolve all callbacks with the original value", () => {
  //         promise.then(success("A", "aVal"), error(), progress());
  //         promise.then(success("B", "bErr", true), error(), progress());
  //         promise.then(success("C", q.reject("cReason")), error(), progress());
  //         promise.then(
  //           success("D", q.reject("dReason"), true),
  //           error(),
  //           progress(),
  //         );
  //         promise.then(success("E", "eVal"), error(), progress());

  //         expect(logStr()).toBe("");
  //         syncResolve(deferred, "yup");
  //         expect(log).toEqual([
  //           "successA(yup)->aVal",
  //           "successB(yup)->throw(bErr)",
  //           "successC(yup)->{}",
  //           "successD(yup)->throw({})",
  //           "successE(yup)->eVal",
  //         ]);
  //       });

  //       it("should reject all callbacks with the original reason", () => {
  //         promise.then(success(), error("A", "aVal"), progress());
  //         promise.then(success(), error("B", "bEr", true), progress());
  //         promise.then(success(), error("C", q.reject("cReason")), progress());
  //         promise.then(success(), error("D", "dVal"), progress());

  //         expect(logStr()).toBe("");
  //         syncReject(deferred, "noo!");
  //         expect(logStr()).toBe(
  //           "errorA(noo!)->aVal; errorB(noo!)->throw(bEr); errorC(noo!)->{}; errorD(noo!)->dVal",
  //         );
  //       });

  //       it("should notify all callbacks with the original value", () => {
  //         promise.then(success(), error(), progress("A", "aVal"));
  //         promise.then(success(), error(), progress("B", "bErr", true));
  //         promise.then(success(), error(), progress("C", q.reject("cReason")));
  //         promise.then(
  //           success(),
  //           error(),
  //           progress("C_reject", q.reject("cRejectReason"), true),
  //         );
  //         promise.then(success(), error(), progress("Z", "the end!"));

  //         expect(logStr()).toBe("");
  //         syncNotify(deferred, "yup");
  //         expect(log).toEqual([
  //           "progressA(yup)->aVal",
  //           "progressB(yup)->throw(bErr)",
  //           "progressC(yup)->{}",
  //           "progressC_reject(yup)->throw({})",
  //           "progressZ(yup)->the end!",
  //         ]);
  //       });

  //       it("should propagate resolution and rejection between dependent promises", () => {
  //         promise
  //           .then(success(1, "x"), error("1"))
  //           .then(success(2, "y", true), error("2"))
  //           .then(success(3), error(3, "z", true))
  //           .then(success(4), error(4, "done"))
  //           .then(success(5), error(5));

  //         expect(logStr()).toBe("");
  //         syncResolve(deferred, "sweet!");
  //         expect(log).toEqual([
  //           "success1(sweet!)->x",
  //           "success2(x)->throw(y)",
  //           "error3(y)->throw(z)",
  //           "error4(z)->done",
  //           "success5(done)->done",
  //         ]);
  //       });

  //       it("should propagate notification between dependent promises", () => {
  //         promise
  //           .then(success(), error(), progress(1, "a"))
  //           .then(success(), error(), progress(2, "b"))
  //           .then(success(), error(), progress(3, "c"))
  //           .then(success(), error(), progress(4))
  //           .then(success(), error(), progress(5));

  //         expect(logStr()).toBe("");
  //         syncNotify(deferred, "wait");
  //         expect(log).toEqual([
  //           "progress1(wait)->a",
  //           "progress2(a)->b",
  //           "progress3(b)->c",
  //           "progress4(c)->c",
  //           "progress5(c)->c",
  //         ]);
  //       });

  //       it("should reject a derived promise if an exception is thrown while resolving its parent", () => {
  //         promise
  //           .then(success(1, "oops", true), error(1))
  //           .then(success(2), error(2));
  //         syncResolve(deferred, "done!");
  //         expect(logStr()).toBe(
  //           "success1(done!)->throw(oops); error2(oops)->reject(oops)",
  //         );
  //       });

  //       it("should reject a derived promise if an exception is thrown while rejecting its parent", () => {
  //         promise.then(null, error(1, "oops", true)).then(success(2), error(2));
  //         syncReject(deferred, "timeout");
  //         expect(logStr()).toBe(
  //           "error1(timeout)->throw(oops); error2(oops)->reject(oops)",
  //         );
  //       });

  //       it("should stop notification propagation in case of error", () => {
  //         promise
  //           .then(success(), error(), progress(1))
  //           .then(success(), error(), progress(2, "ops!", true))
  //           .then(success(), error(), progress(3));

  //         expect(logStr()).toBe("");
  //         syncNotify(deferred, "wait");
  //         expect(log).toEqual([
  //           "progress1(wait)->wait",
  //           "progress2(wait)->throw(ops!)",
  //         ]);
  //       });

  //       it("should call success callback in the next turn even if promise is already resolved", () => {
  //         deferred.resolve("done!");

  //         promise.then(success());
  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["success(done!)->done!"]);
  //       });

  //       it("should call error callback in the next turn even if promise is already rejected", () => {
  //         deferred.reject("oops!");

  //         promise.then(null, error());
  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["error(oops!)->reject(oops!)"]);
  //       });

  //       it("should forward success resolution when success callbacks are not functions", () => {
  //         deferred.resolve("yay!");

  //         promise
  //           .then(1)
  //           .then(null)
  //           .then({})
  //           .then("gah!")
  //           .then([])
  //           .then(success());

  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["success(yay!)->yay!"]);
  //       });

  //       it("should forward error resolution when error callbacks are not functions", () => {
  //         deferred.reject("oops!");

  //         promise
  //           .then(null, 1)
  //           .then(null, null)
  //           .then(null, {})
  //           .then(null, "gah!")
  //           .then(null, [])
  //           .then(null, error());

  //         expect(logStr()).toBe("");

  //         mockNextTick.flush();
  //         expect(log).toEqual(["error(oops!)->reject(oops!)"]);
  //       });
  //     });

  //     describe("finally", () => {
  //       it("should not take an argument", () => {
  //         promise.finally(fin(1));
  //         syncResolve(deferred, "foo");
  //         expect(logStr()).toBe("finally1()");
  //       });

  //       describe("when the promise is fulfilled", () => {
  //         it("should call the callback", () => {
  //           promise.then(success(1)).finally(fin(1));
  //           syncResolve(deferred, "foo");
  //           expect(logStr()).toBe("success1(foo)->foo; finally1()");
  //         });

  //         it("should fulfill with the original value", () => {
  //           promise
  //             .finally(fin("B", "b"), error("B"))
  //             .then(success("BB", "bb"), error("BB"));
  //           syncResolve(deferred, "RESOLVED_VAL");
  //           expect(log).toEqual([
  //             "finallyB()->b",
  //             "successBB(RESOLVED_VAL)->bb",
  //           ]);
  //         });

  //         it("should fulfill with the original value (larger test)", () => {
  //           promise.then(success("A", "a"), error("A"));
  //           promise
  //             .finally(fin("B", "b"), error("B"))
  //             .then(success("BB", "bb"), error("BB"));
  //           promise
  //             .then(success("C", "c"), error("C"))
  //             .finally(fin("CC", "IGNORED"))
  //             .then(success("CCC", "cc"), error("CCC"))
  //             .then(success("CCCC", "ccc"), error("CCCC"));
  //           syncResolve(deferred, "RESOLVED_VAL");

  //           expect(log).toEqual([
  //             "successA(RESOLVED_VAL)->a",
  //             "finallyB()->b",
  //             "successC(RESOLVED_VAL)->c",
  //             "finallyCC()->IGNORED",
  //             "successBB(RESOLVED_VAL)->bb",
  //             "successCCC(c)->cc",
  //             "successCCCC(cc)->ccc",
  //           ]);
  //         });

  //         describe("when the callback returns a promise", () => {
  //           describe("that is fulfilled", () => {
  //             it("should fulfill with the original reason after that promise resolves", () => {
  //               const returnedDef = defer();
  //               returnedDef.resolve("bar");

  //               promise.finally(fin(1, returnedDef.promise)).then(success(2));

  //               syncResolve(deferred, "foo");

  //               expect(logStr()).toBe("finally1()->{}; success2(foo)->foo");
  //             });
  //           });

  //           describe("that is rejected", () => {
  //             it("should reject with this new rejection reason", () => {
  //               const returnedDef = defer();
  //               returnedDef.reject("bar");
  //               promise
  //                 .finally(fin(1, returnedDef.promise))
  //                 .then(success(2), error(1));
  //               syncResolve(deferred, "foo");
  //               expect(logStr()).toBe(
  //                 "finally1()->{}; error1(bar)->reject(bar)",
  //               );
  //             });
  //           });
  //         });

  //         describe("when the callback throws an exception", () => {
  //           it("should reject with this new exception", () => {
  //             promise
  //               .finally(fin(1, "exception", true))
  //               .then(success(1), error(2));
  //             syncResolve(deferred, "foo");
  //             expect(logStr()).toBe(
  //               "finally1()->throw(exception); error2(exception)->reject(exception)",
  //             );
  //           });
  //         });
  //       });

  //       describe("when the promise is rejected", () => {
  //         it("should call the callback", () => {
  //           promise.finally(fin(1)).then(success(2), error(1));
  //           syncReject(deferred, "foo");
  //           expect(logStr()).toBe("finally1(); error1(foo)->reject(foo)");
  //         });

  //         it("should reject with the original reason", () => {
  //           promise.finally(fin(1), "hello").then(success(2), error(2));
  //           syncReject(deferred, "original");
  //           expect(logStr()).toBe(
  //             "finally1(); error2(original)->reject(original)",
  //           );
  //         });

  //         describe("when the callback returns a promise", () => {
  //           describe("that is fulfilled", () => {
  //             it("should reject with the original reason after that promise resolves", () => {
  //               const returnedDef = defer();
  //               returnedDef.resolve("bar");
  //               promise
  //                 .finally(fin(1, returnedDef.promise))
  //                 .then(success(2), error(2));
  //               syncReject(deferred, "original");
  //               expect(logStr()).toBe(
  //                 "finally1()->{}; error2(original)->reject(original)",
  //               );
  //             });
  //           });

  //           describe("that is rejected", () => {
  //             it("should reject with the new reason", () => {
  //               const returnedDef = defer();
  //               returnedDef.reject("bar");
  //               promise
  //                 .finally(fin(1, returnedDef.promise))
  //                 .then(success(2), error(1));
  //               syncResolve(deferred, "foo");
  //               expect(logStr()).toBe(
  //                 "finally1()->{}; error1(bar)->reject(bar)",
  //               );
  //             });
  //           });
  //         });

  //         describe("when the callback throws an exception", () => {
  //           it("should reject with this new exception", () => {
  //             promise
  //               .finally(fin(1, "exception", true))
  //               .then(success(1), error(2));
  //             syncResolve(deferred, "foo");
  //             expect(logStr()).toBe(
  //               "finally1()->throw(exception); error2(exception)->reject(exception)",
  //             );
  //           });
  //         });
  //       });
  //     });

  //     describe("catch", () => {
  //       it("should be a shorthand for defining promise error handlers", () => {
  //         promise.catch(error(1)).then(null, error(2));
  //         syncReject(deferred, "foo");
  //         expect(logStr()).toBe(
  //           "error1(foo)->reject(foo); error2(foo)->reject(foo)",
  //         );
  //       });
  //     });
  //   });
  // });

  // describe("reject", () => {
  //   it("should package a string into a rejected promise", () => {
  //     const rejectedPromise = q.reject("not gonna happen");
  //     promise.then(success(), error());
  //     syncResolve(deferred, rejectedPromise);
  //     expect(log).toEqual([
  //       "error(not gonna happen)->reject(not gonna happen)",
  //     ]);
  //   });

  //   it("should package an exception into a rejected promise", () => {
  //     const rejectedPromise = q.reject(new Error("not gonna happen"));
  //     promise.then(success(), error());
  //     syncResolve(deferred, rejectedPromise);
  //     expect(log).toEqual([
  //       "error(Error: not gonna happen)->reject(Error: not gonna happen)",
  //     ]);
  //   });

  //   it("should return a promise that forwards callbacks if the callbacks are missing", () => {
  //     const rejectedPromise = q.reject("rejected");
  //     promise.then(success(), error());
  //     syncResolve(deferred, rejectedPromise.then());
  //     expect(log).toEqual(["error(rejected)->reject(rejected)"]);
  //   });

  //   it("should catch exceptions thrown in errback and forward them to derived promises", () => {
  //     const rejectedPromise = q.reject("rejected");
  //     rejectedPromise
  //       .then(null, error("Broken", "catch me!", true))
  //       .then(null, error("Affected"));
  //     mockNextTick.flush();
  //     expect(log).toEqual([
  //       "errorBroken(rejected)->throw(catch me!)",
  //       "errorAffected(catch me!)->reject(catch me!)",
  //     ]);
  //   });

  //   it("should have functions `finally` and `catch`", () => {
  //     const rejectedPromise = q.reject("rejected");
  //     expect(rejectedPromise.finally).not.toBeUndefined();
  //     expect(rejectedPromise.catch).not.toBeUndefined();
  //     rejectedPromise.catch(() => {});
  //     mockNextTick.flush();
  //   });
  // });

  // describe("when", () => {
  //   describe("resolution", () => {
  //     it("should call the success callback in the next turn when the value is a non-promise", () => {
  //       q.resolve("hello", success(), error());
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(hello)->hello");
  //     });

  //     it("should call the success callback in the next turn when the value is a resolved promise", () => {
  //       deferred.resolve("hello");
  //       q.resolve(deferred.promise, success(), error());
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success(hello)->hello");
  //     });

  //     it("should call the errback in the next turn when the value is a rejected promise", () => {
  //       deferred.reject("nope");
  //       q.resolve(deferred.promise, success(), error());
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error(nope)->reject(nope)");
  //     });

  //     it("should call the success callback after the original promise is resolved", () => {
  //       q.resolve(deferred.promise, success(), error());
  //       expect(logStr()).toBe("");
  //       expect(logStr()).toBe("");
  //       syncResolve(deferred, "hello");
  //       expect(logStr()).toBe("success(hello)->hello");
  //     });

  //     it("should call the errback after the original promise is rejected", () => {
  //       q.resolve(deferred.promise, success(), error());
  //       expect(logStr()).toBe("");
  //       expect(logStr()).toBe("");
  //       syncReject(deferred, "nope");
  //       expect(logStr()).toBe("error(nope)->reject(nope)");
  //     });
  //   });

  //   describe("notification", () => {
  //     it("should call the progressBack when the value is a promise and gets notified", () => {
  //       q.resolve(deferred.promise, success(), error(), progress());
  //       expect(logStr()).toBe("");
  //       syncNotify(deferred, "notification");
  //       expect(logStr()).toBe("progress(notification)->notification");
  //     });
  //   });

  //   describe("resolve", () => {
  //     it('should be an alias of the "when" function', () => {
  //       expect(q.resolve).toBeDefined();
  //       expect(q.resolve).toEqual(q.when);
  //     });
  //   });

  //   describe("optional callbacks", () => {
  //     it("should not require success callback and propagate resolution", () => {
  //       q.resolve("hi", null, error()).then(success(2), error());
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success2(hi)->hi");
  //     });

  //     it("should not require success callback and propagate rejection", () => {
  //       q.resolve(q.reject("sorry"), null, error(1)).then(success(), error(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "error1(sorry)->reject(sorry); error2(sorry)->reject(sorry)",
  //       );
  //     });

  //     it("should not require errback and propagate resolution", () => {
  //       q.resolve("hi", success(1, "hello")).then(success(2), error());
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("success1(hi)->hello; success2(hello)->hello");
  //     });

  //     it("should not require errback and propagate rejection", () => {
  //       q.resolve(q.reject("sorry"), success()).then(success(2), error(2));
  //       expect(logStr()).toBe("");
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error2(sorry)->reject(sorry)");
  //     });

  //     it("should not require progressBack and propagate notification", () => {
  //       q.resolve(deferred.promise).then(success(), error(), progress());
  //       expect(logStr()).toBe("");
  //       syncNotify(deferred, "notification");
  //       expect(logStr()).toBe("progress(notification)->notification");
  //     });
  //   });

  //   describe("returned promise", () => {
  //     it(
  //       "should return a promise that can be resolved with a value returned from the success " +
  //         "callback",
  //       () => {
  //         q.resolve("hello", success(1, "hi"), error()).then(success(2), error());
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("success1(hello)->hi; success2(hi)->hi");
  //       },
  //     );

  //     it(
  //       "should return a promise that can be rejected with a rejected promise returned from the " +
  //         "success callback",
  //       () => {
  //         q.resolve("hello", success(1, q.reject("sorry")), error()).then(
  //           success(),
  //           error(2),
  //         );
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "success1(hello)->{}; error2(sorry)->reject(sorry)",
  //         );
  //       },
  //     );

  //     it("should return a promise that can be resolved with a value returned from the errback", () => {
  //       q.resolve(q.reject("sorry"), success(), error(1, "hi")).then(
  //         success(2),
  //         error(),
  //       );
  //       mockNextTick.flush();
  //       expect(logStr()).toBe("error1(sorry)->hi; success2(hi)->hi");
  //     });

  //     it(
  //       "should return a promise that can be rejected with a rejected promise returned from the " +
  //         "errback",
  //       () => {
  //         q.resolve(q.reject("sorry"), success(), error(1, q.reject("sigh"))).then(
  //           success(),
  //           error(2),
  //         );
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "error1(sorry)->{}; error2(sigh)->reject(sigh)",
  //         );
  //       },
  //     );

  //     it(
  //       "should return a promise that can be resolved with a promise returned from the success " +
  //         "callback",
  //       () => {
  //         const deferred2 = defer();
  //         q.resolve("hi", success(1, deferred2.promise), error()).then(
  //           success(2),
  //           error(),
  //         );
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("success1(hi)->{}");
  //         syncResolve(deferred2, "finally!");
  //         expect(logStr()).toBe(
  //           "success1(hi)->{}; success2(finally!)->finally!",
  //         );
  //       },
  //     );

  //     it(
  //       "should return a promise that can be resolved with promise returned from the errback " +
  //         "callback",
  //       () => {
  //         const deferred2 = defer();
  //         q.resolve(
  //           q.reject("sorry"),
  //           success(),
  //           error(1, deferred2.promise),
  //         ).then(success(2), error());
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("error1(sorry)->{}");
  //         syncResolve(deferred2, "finally!");
  //         expect(logStr()).toBe(
  //           "error1(sorry)->{}; success2(finally!)->finally!",
  //         );
  //       },
  //     );
  //   });

  //   describe("security", () => {
  //     it(
  //       "should call success callback only once even if the original promise gets fulfilled " +
  //         "multiple times",
  //       () => {
  //         const evilPromise = {
  //           then(success, error, progress) {
  //             evilPromise.success = success;
  //             evilPromise.error = error;
  //             evilPromise.progress = progress;
  //           },
  //         };

  //         q.resolve(evilPromise, success(), error());
  //         expect(logStr()).toBe("");
  //         evilPromise.success("done");
  //         mockNextTick.flush(); // TODO(i) wrong queue, evil promise would be resolved outside of the
  //         //   scope.$apply lifecycle and in that case we should have some kind
  //         //   of fallback queue for calling our callbacks from. Otherwise the
  //         //   application will get stuck until something triggers next $apply.
  //         expect(logStr()).toBe("success(done)->done");

  //         evilPromise.success("evil is me");
  //         evilPromise.error("burn burn");
  //         expect(logStr()).toBe("success(done)->done");
  //       },
  //     );

  //     it(
  //       "should call errback only once even if the original promise gets fulfilled multiple " +
  //         "times",
  //       () => {
  //         const evilPromise = {
  //           then(success, error, progress) {
  //             evilPromise.success = success;
  //             evilPromise.error = error;
  //             evilPromise.progress = progress;
  //           },
  //         };

  //         q.resolve(evilPromise, success(), error());
  //         expect(logStr()).toBe("");
  //         evilPromise.error("failed");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe("error(failed)->reject(failed)");

  //         evilPromise.error("muhaha");
  //         evilPromise.success("take this");
  //         expect(logStr()).toBe("error(failed)->reject(failed)");
  //       },
  //     );

  //     it(
  //       "should not call progressBack after promise gets fulfilled, even if original promise " +
  //         "gets notified multiple times",
  //       () => {
  //         const evilPromise = {
  //           then(success, error, progress) {
  //             evilPromise.success = success;
  //             evilPromise.error = error;
  //             evilPromise.progress = progress;
  //           },
  //         };

  //         q.resolve(evilPromise, success(), error(), progress());
  //         expect(logStr()).toBe("");
  //         evilPromise.progress("notification");
  //         evilPromise.success("ok");
  //         mockNextTick.flush();
  //         expect(logStr()).toBe(
  //           "progress(notification)->notification; success(ok)->ok",
  //         );

  //         evilPromise.progress("muhaha");
  //         expect(logStr()).toBe(
  //           "progress(notification)->notification; success(ok)->ok",
  //         );
  //       },
  //     );
  //   });
  // });

  // describe("all (array)", () => {
  //   it("should resolve all or nothing", () => {
  //     let result;
  //     q.all([]).then((r) => {
  //       result = r;
  //     });
  //     mockNextTick.flush();
  //     expect(result).toEqual([]);
  //   });

  //   it("should take an array of promises and return a promise for an array of results", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.all([promise, deferred1.promise, deferred2.promise]).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred, "hi");
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred2, "cau");
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred1, "hola");
  //     expect(logStr()).toBe(
  //       'success(["hi","hola","cau"])->["hi","hola","cau"]',
  //     );
  //   });

  //   it("should reject the derived promise if at least one of the promises in the array is rejected", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.all([promise, deferred1.promise, deferred2.promise]).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred2, "cau");
  //     expect(logStr()).toBe("");
  //     syncReject(deferred1, "oops");
  //     expect(logStr()).toBe("error(oops)->reject(oops)");
  //   });

  //   it("should not forward notifications from individual promises to the combined promise", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.all([promise, deferred1.promise, deferred2.promise]).then(
  //       success(),
  //       error(),
  //       progress(),
  //     );
  //     expect(logStr()).toBe("");
  //     deferred.notify("x");
  //     deferred2.notify("y");
  //     expect(logStr()).toBe("");
  //     mockNextTick.flush();
  //     expect(logStr()).toBe("");
  //   });

  //   it("should ignore multiple resolutions of an (evil) array promise", () => {
  //     const evilPromise = {
  //       then(success, error) {
  //         evilPromise.success = success;
  //         evilPromise.error = error;
  //       },
  //     };

  //     q.all([promise, evilPromise]).then(success(), error());
  //     expect(logStr()).toBe("");

  //     evilPromise.success("first");
  //     evilPromise.success("muhaha");
  //     evilPromise.error("arghhh");
  //     expect(logStr()).toBe("");

  //     syncResolve(deferred, "done");
  //     expect(logStr()).toBe('success(["done","first"])->["done","first"]');
  //   });
  // });

  // describe("all (hash)", () => {
  //   it("should resolve all or nothing", () => {
  //     let result;
  //     q.all({}).then((r) => {
  //       result = r;
  //     });
  //     mockNextTick.flush();
  //     expect(result).toEqual({});
  //   });

  //   it("should take a hash of promises and return a promise for a hash of results", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.all({ en: promise, fr: deferred1.promise, es: deferred2.promise }).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred, "hi");
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred2, "hola");
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred1, "salut");
  //     expect(logStr()).toBe(
  //       'success({"en":"hi","es":"hola","fr":"salut"})->{"en":"hi","es":"hola","fr":"salut"}',
  //     );
  //   });

  //   it("should reject the derived promise if at least one of the promises in the hash is rejected", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.all({ en: promise, fr: deferred1.promise, es: deferred2.promise }).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred2, "hola");
  //     expect(logStr()).toBe("");
  //     syncReject(deferred1, "oops");
  //     expect(logStr()).toBe("error(oops)->reject(oops)");
  //   });

  //   it("should ignore multiple resolutions of an (evil) hash promise", () => {
  //     const evilPromise = {
  //       then(success, error) {
  //         evilPromise.success = success;
  //         evilPromise.error = error;
  //       },
  //     };

  //     q.all({ good: promise, evil: evilPromise }).then(success(), error());
  //     expect(logStr()).toBe("");

  //     evilPromise.success("first");
  //     evilPromise.success("muhaha");
  //     evilPromise.error("arghhh");
  //     expect(logStr()).toBe("");

  //     syncResolve(deferred, "done");
  //     expect(logStr()).toBe(
  //       'success({"evil":"first","good":"done"})->{"evil":"first","good":"done"}',
  //     );
  //   });

  //   it("should handle correctly situation when given the same promise several times", () => {
  //     q.all({ first: promise, second: promise, third: promise }).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");

  //     syncResolve(deferred, "done");
  //     expect(logStr()).toBe(
  //       'success({"first":"done","second":"done","third":"done"})->{"first":"done","second":"done","third":"done"}',
  //     );
  //   });
  // });

  // describe("race (array)", () => {
  //   it("should do nothing if given an empty array", () => {
  //     q.race([]).then(success(), error());
  //     expect(mockNextTick.queue.length).toBe(0);
  //     expect(logStr()).toBe("");
  //   });

  //   it("should resolve as soon as the first promise is settled by resolution", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.race([promise, deferred1.promise, deferred2.promise]).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred1, "hi");
  //     expect(logStr()).toBe("success(hi)->hi");
  //     syncResolve(deferred2, "cau");
  //     expect(logStr()).toBe("success(hi)->hi");
  //     syncReject(deferred, "hola");
  //     expect(logStr()).toBe("success(hi)->hi");
  //   });

  //   it("should reject as soon as the first promise is settled by rejection", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.race([promise, deferred1.promise, deferred2.promise]).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncReject(deferred1, "hi");
  //     expect(logStr()).toBe("error(hi)->reject(hi)");
  //     syncResolve(deferred2, "cau");
  //     expect(logStr()).toBe("error(hi)->reject(hi)");
  //     syncReject(deferred, "hola");
  //     expect(logStr()).toBe("error(hi)->reject(hi)");
  //   });
  // });

  // describe("race (hash)", () => {
  //   it("should do nothing if given an empty object", () => {
  //     q.race({}).then(success(), error());
  //     expect(mockNextTick.queue.length).toBe(0);
  //     expect(logStr()).toBe("");
  //   });

  //   it("should resolve as soon as the first promise is settled by resolution", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.race({ a: promise, b: deferred1.promise, c: deferred2.promise }).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncResolve(deferred1, "hi");
  //     expect(logStr()).toBe("success(hi)->hi");
  //     syncResolve(deferred2, "cau");
  //     expect(logStr()).toBe("success(hi)->hi");
  //     syncReject(deferred, "hola");
  //     expect(logStr()).toBe("success(hi)->hi");
  //   });

  //   it("should reject as soon as the first promise is settled by rejection", () => {
  //     const deferred1 = defer();
  //     const deferred2 = defer();

  //     q.race({ a: promise, b: deferred1.promise, c: deferred2.promise }).then(
  //       success(),
  //       error(),
  //     );
  //     expect(logStr()).toBe("");
  //     syncReject(deferred1, "hi");
  //     expect(logStr()).toBe("error(hi)->reject(hi)");
  //     syncResolve(deferred2, "cau");
  //     expect(logStr()).toBe("error(hi)->reject(hi)");
  //     syncReject(deferred, "hola");
  //     expect(logStr()).toBe("error(hi)->reject(hi)");
  //   });
  // });

  // describe("exception logging", () => {
  //   const mockExceptionLogger = {
  //     log: [],
  //     logger(e) {
  //       mockExceptionLogger.log.push(e);
  //     },
  //   };

  //   beforeEach(() => {
  //     q = qFactory(mockNextTick.nextTick, mockExceptionLogger.logger);
  //     defer = q.defer;
  //     deferred = defer();
  //     promise = deferred.promise;
  //     log = [];
  //     mockExceptionLogger.log = [];
  //   });

  //   describe("in then", () => {
  //     it("should NOT log exceptions thrown in a success callback but reject the derived promise", () => {
  //       const success1 = success(1, "oops", true);
  //       promise
  //         .then(success1)
  //         .then(success(2), error(2))
  //         .catch(() => {});
  //       syncResolve(deferred, "done");
  //       expect(logStr()).toBe(
  //         "success1(done)->throw(oops); error2(oops)->reject(oops)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it("should NOT log exceptions when a success callback returns rejected promise", () => {
  //       promise
  //         .then(success(1, q.reject("rejected")))
  //         .then(success(2), error(2))
  //         .catch(() => {});
  //       syncResolve(deferred, "done");
  //       expect(logStr()).toBe(
  //         "success1(done)->{}; error2(rejected)->reject(rejected)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it("should NOT log exceptions thrown in an errback but reject the derived promise", () => {
  //       const error1 = error(1, "oops", true);
  //       promise
  //         .then(null, error1)
  //         .then(success(2), error(2))
  //         .catch(() => {});
  //       syncReject(deferred, "nope");
  //       expect(logStr()).toBe(
  //         "error1(nope)->throw(oops); error2(oops)->reject(oops)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it("should NOT log exceptions when an errback returns a rejected promise", () => {
  //       promise
  //         .then(null, error(1, q.reject("rejected")))
  //         .then(success(2), error(2))
  //         .catch(() => {});
  //       syncReject(deferred, "nope");
  //       expect(logStr()).toBe(
  //         "error1(nope)->{}; error2(rejected)->reject(rejected)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it(
  //       "should log exceptions thrown in a progressBack and stop propagation, but should NOT reject " +
  //         "the promise",
  //       () => {
  //         promise
  //           .then(success(), error(), progress(1, "failed", true))
  //           .then(null, error(1), progress(2))
  //           .catch(() => {});
  //         syncNotify(deferred, "10%");
  //         expect(logStr()).toBe("progress1(10%)->throw(failed)");
  //         expect(mockExceptionLogger.log).toEqual(["failed"]);
  //         log = [];
  //         syncResolve(deferred, "ok");
  //         expect(logStr()).toBe("success(ok)->ok");
  //       },
  //     );
  //   });

  //   describe("in when", () => {
  //     it("should NOT log exceptions thrown in a success callback but reject the derived promise", () => {
  //       const success1 = success(1, "oops", true);
  //       q.resolve("hi", success1, error())
  //         .then(success(), error(2))
  //         .catch(() => {});
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "success1(hi)->throw(oops); error2(oops)->reject(oops)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it("should NOT log exceptions when a success callback returns rejected promise", () => {
  //       q.resolve("hi", success(1, q.reject("rejected")))
  //         .then(success(2), error(2))
  //         .catch(() => {});
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "success1(hi)->{}; error2(rejected)->reject(rejected)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it("should NOT log exceptions thrown in a errback but reject the derived promise", () => {
  //       const error1 = error(1, "oops", true);
  //       q.resolve(q.reject("sorry"), success(), error1)
  //         .then(success(), error(2))
  //         .catch(() => {});
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "error1(sorry)->throw(oops); error2(oops)->reject(oops)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });

  //     it("should NOT log exceptions when an errback returns a rejected promise", () => {
  //       q.resolve(q.reject("sorry"), success(), error(1, q.reject("rejected")))
  //         .then(success(2), error(2))
  //         .catch(() => {});
  //       mockNextTick.flush();
  //       expect(logStr()).toBe(
  //         "error1(sorry)->{}; error2(rejected)->reject(rejected)",
  //       );
  //       expect(mockExceptionLogger.log).toEqual([]);
  //     });
  //   });
  // });

  // describe("when exceptionHandler is called", () => {
  //   function CustomError() {}
  //   CustomError.prototype = Object.create(Error.prototype);

  //   const errorEg = new Error("Fail");
  //   const errorStr = toDebugString(errorEg);

  //   const customError = new CustomError("Custom");
  //   const customErrorStr = toDebugString(customError);

  //   const nonErrorObj = { isATest: "this is" };
  //   const nonErrorObjStr = toDebugString(nonErrorObj);

  //   const fixtures = [
  //     {
  //       type: "Error object",
  //       value: errorEg,
  //       expected: {
  //         exception: errorEg,
  //         reason: `Possibly unhandled rejection: ${errorStr}`,
  //       },
  //     },
  //     {
  //       type: "custom Error object",
  //       value: customError,
  //       expected: {
  //         exception: customError,
  //         reason: `Possibly unhandled rejection: ${customErrorStr}`,
  //       },
  //     },
  //     {
  //       type: "non-Error object",
  //       value: nonErrorObj,
  //       expected: {
  //         reason: `Possibly unhandled rejection: ${nonErrorObjStr}`,
  //       },
  //     },
  //     {
  //       type: "string primitive",
  //       value: "foo",
  //       expected: {
  //         reason: "Possibly unhandled rejection: foo",
  //       },
  //     },
  //   ];
  //   forEach(fixtures, (fixture) => {
  //     const { type } = fixture;
  //     const { value } = fixture;
  //     const { expected } = fixture;

  //     describe(`with ${type}`, () => {
  //       it("should log an unhandled rejected promise", () => {
  //         const defer = q.defer();
  //         defer.reject(value);
  //         mockNextTick.flush();
  //         expect(exceptionHandlerCalls).toEqual([expected]);
  //       });

  //       it("should not log an unhandled rejected promise if disabled", () => {
  //         const defer = q_no_error.defer();
  //         defer.reject(value);
  //         expect(exceptionHandlerCalls).toEqual([]);
  //       });

  //       it("should log a handled rejected promise on a promise without rejection callbacks", () => {
  //         const defer = q.defer();
  //         defer.promise.then(() => {});
  //         defer.reject(value);
  //         mockNextTick.flush();
  //         expect(exceptionHandlerCalls).toEqual([expected]);
  //       });

  //       it("should not log a handled rejected promise", () => {
  //         const defer = q.defer();
  //         defer.promise.catch(() => {});
  //         defer.reject(value);
  //         mockNextTick.flush();
  //         expect(exceptionHandlerCalls).toEqual([]);
  //       });

  //       it("should not log a handled rejected promise that is handled in a future tick", () => {
  //         const defer = q.defer();
  //         defer.promise.catch(() => {});
  //         defer.resolve(q.reject(value));
  //         mockNextTick.flush();
  //         expect(exceptionHandlerCalls).toEqual([]);
  //       });
  //     });
  //   });
  // });
});
