import { Angular } from "../../loader";
import { createInjector } from "../di/injector";
import { wait } from "../../shared/test-utils";

describe("$interval", () => {
  let injector;
  let $interval;
  let $rootScope;
  let errors;

  beforeEach(() => {
    errors = [];
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", () => {
        return (exception) => {
          errors.push(exception);
        };
      });
    injector = createInjector(["myModule"]);

    $interval = injector.get("$interval");
    $rootScope = injector.get("$rootScope");
  });

  it("should run tasks repeatedly", async () => {
    let counter = 0;
    $interval(() => {
      counter++;
    }, 1);
    expect(counter).toBe(0);
    await wait(15);
    expect(counter).toBeGreaterThanOrEqual(1);
  });

  it("should call $apply after each task is executed", (done) => {
    const applySpy = spyOn($rootScope, "$apply").and.callThrough();

    $interval(() => {}, 1);
    expect(applySpy).not.toHaveBeenCalled();

    setTimeout(() => {
      expect(applySpy).toHaveBeenCalled();
    }, 3);

    applySpy.calls.reset();

    $interval(() => {}, 1);
    $interval(() => {}, 1);

    setTimeout(() => {
      expect(applySpy).toHaveBeenCalledTimes(3);
      done();
    }, 1);
  });

  it("should allow you to specify a number of iterations", async () => {
    let counter = 0;
    $interval(
      () => {
        counter++;
      },
      1,
      2,
    );

    await wait(15);
    expect(counter).toBe(2);
  });

  it("should allow you to specify a number of arguments", (done) => {
    const task1 = jasmine.createSpy("task1");
    const task2 = jasmine.createSpy("task2");
    const task3 = jasmine.createSpy("task3");
    $interval(task1, 1, 2, true, "Task1");
    $interval(task2, 1, 2, true, "Task2");
    $interval(task3, 1, 2, true, "I", "am", "a", "Task3", "spy");

    setTimeout(() => {
      expect(task1).toHaveBeenCalledWith("Task1");
      expect(task2).toHaveBeenCalledWith("Task2");
      expect(task3).toHaveBeenCalledWith("I", "am", "a", "Task3", "spy");
    }, 1);

    task1.calls.reset();
    task2.calls.reset();
    task3.calls.reset();

    setTimeout(() => {
      expect(task1).toHaveBeenCalledWith("Task1");
      expect(task2).toHaveBeenCalledWith("Task2");
      expect(task3).toHaveBeenCalledWith("I", "am", "a", "Task3", "spy");
      done();
    }, 1);
  });

  it("should return a promise which will be updated with the count on each iteration", async () => {
    const log = [];
    const promise = $interval(() => {
      log.push("tick");
    }, 1);

    promise.then(
      (value) => {
        log.push(`promise success: ${value}`);
      },
      (err) => {
        log.push(`promise error: ${err}`);
      },
      (note) => {
        log.push(`promise update: ${note}`);
      },
    );
    expect(log).toEqual([]);

    await wait(5);
    expect(log[0]).toEqual("tick");
    expect(log[1]).toEqual("tick");
  });

  it("should return a promise which will be resolved after the specified number of iterations", async () => {
    const log = [];
    const promise = $interval(
      () => {
        log.push("tick");
      },
      1,
      2,
    );

    promise.then(
      (value) => {
        log.push(`promise success: ${value}`);
      },
      (err) => {
        log.push(`promise error: ${err}`);
      },
    );
    expect(log).toEqual([]);
    await wait(15);
    expect(log).toEqual(["tick", "tick", "promise success: 2"]);
  });

  describe("exception handling", () => {
    it("should delegate exception to the $exceptionHandler service", (done) => {
      errors = [];
      $interval(() => {
        throw "Test Error";
      }, 10);

      setTimeout(() => {
        expect(errors).toContain("Test Error");
        done();
      }, 20);
    });

    it("should call $apply even if an exception is thrown in callback", (done) => {
      const applySpy = spyOn($rootScope, "$apply").and.callThrough();

      $interval(() => {
        throw "Test Error2";
      }, 10);
      expect(applySpy).not.toHaveBeenCalled();

      setTimeout(() => {
        expect(applySpy).toHaveBeenCalled();
        done();
      }, 11);
    });
  });

  describe("cancel", () => {
    it("should cancel tasks", (done) => {
      const task1 = jasmine.createSpy("task1", 1);
      const task2 = jasmine.createSpy("task2", 1);
      const task3 = jasmine.createSpy("task3", 1);
      let promise1;
      let promise3;

      promise1 = $interval(task1, 2);
      $interval(task2, 1);
      promise3 = $interval(task3, 3);

      $interval.cancel(promise3);
      $interval.cancel(promise1);
      setTimeout(() => {
        expect(task1).not.toHaveBeenCalled();
        expect(task2).toHaveBeenCalled();
        expect(task3).not.toHaveBeenCalled();
        done();
      }, 1);
    });

    it("should cancel the promise", (done) => {
      const promise = $interval(() => {}, 1);
      const log = [];
      promise.then(
        (value) => {
          log.push(`promise success: ${value}`);
        },
        (err) => {
          log.push(`promise error: ${err}`);
        },
      );
      expect(log).toEqual([]);

      setTimeout(() => {
        $interval.cancel(promise);
      }, 1);

      setTimeout(() => {
        $rootScope.$apply(); // For resolving the promise -
        // necessary since q uses $rootScope.evalAsync.

        expect(log).toEqual(["promise error: canceled"]);
        done();
      }, 2);
    });

    it("should return true if a task was successfully canceled", (done) => {
      const task1 = jasmine.createSpy("task1");
      const task2 = jasmine.createSpy("task2");
      let promise1;
      let promise2;

      promise1 = $interval(task1, 1, 1);
      setTimeout(() => {
        promise2 = $interval(task2, 1, 1);

        expect($interval.cancel(promise1)).toBe(false);
        expect($interval.cancel(promise2)).toBe(true);
        done();
      }, 1);
    });

    it("should not throw an error when given an undefined promise", () => {
      expect($interval.cancel()).toBe(false);
    });

    it("should throw an error when given a non-$interval promise", () => {
      const promise = $interval(() => {}).then(() => {});
      expect(() => {
        $interval.cancel(promise);
      }).toThrowError(/badprom/);
    });

    it("should not trigger digest when cancelled", () => {
      const watchSpy = jasmine.createSpy("watchSpy");
      $rootScope.$watch(watchSpy);

      const t = $interval();
      $interval.cancel(t);
      expect(watchSpy).not.toHaveBeenCalled();
    });
  });

  describe("$window delegation", () => {
    it("should use $window.setInterval instead of the global function", () => {
      const setIntervalSpy = spyOn(window, "setInterval");

      $interval(() => {}, 1);
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    it("should use $window.clearInterval instead of the global function", (done) => {
      const clearIntervalSpy = spyOn(window, "clearInterval");

      $interval(() => {}, 1, 1);
      setTimeout(() => {
        expect(clearIntervalSpy).toHaveBeenCalled();

        clearIntervalSpy.calls.reset();
        $interval.cancel($interval(() => {}, 1));
        expect(clearIntervalSpy).toHaveBeenCalled();
        done();
      }, 1);
    });
  });
});
