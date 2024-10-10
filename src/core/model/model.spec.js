import { wait } from "../../shared/test-utils";
import { createModel } from "./model";

describe("Model", () => {
  let model;
  beforeEach(() => {
    model = createModel();
  });

  it("can be instantiated with plain object", async () => {
    model = createModel({ a: 1, b: { c: 2 } });
    expect(model).toBeDefined();
    expect(model.a).toEqual(1);
    expect(model.b.c).toEqual(2);
    model.a = 2;
    expect(model.a).toEqual(2);
    model.d = 3;
    expect(model.d).toEqual(3);
  });

  it("can register listeners via watch", async () => {
    var listenerFn = jasmine.createSpy();
    model.$watch(() => {}, listenerFn);
    model.$digest();
    expect(listenerFn).toHaveBeenCalled();
  });

  it("calls the watch function with the model as the argument", async () => {
    var watchFn = jasmine.createSpy();
    var listenerFn = () => {};
    model.$watch(watchFn, listenerFn);
    model.$digest();
    expect(watchFn).toHaveBeenCalledWith(model);
  });

  it("calls the listener function when the watched value changes", async () => {
    model.someValue = "a";
    model.counter = 0;

    model.$watch(
      (m) => m.someValue,
      () => {
        model.counter++;
      },
    );
    expect(model.counter).toBe(0);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(1);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(1);

    model.someValue = "c";
    await wait();
    expect(model.counter).toBe(2);
  });

  it("calls the listener function when the watched value is iniatized", async () => {
    model.counter = 0;

    model.$watch(
      (m) => m.someValue,
      () => model.counter++,
    );
    expect(model.counter).toBe(0);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(1);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(1);

    model.someValue = "c";
    await wait();
    expect(model.counter).toBe(2);
  });

  it("calls the listener function when the watched value is destroyed", async () => {
    model.counter = 0;

    model.$watch(
      (m) => m.someValue,
      () => model.counter++,
    );
    expect(model.counter).toBe(0);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(1);

    delete model.someValue;
    await wait();
    expect(model.counter).toBe(2);
  });

  it("can call multiple the listener functions when the watched value changes", async () => {
    model.someValue = "a";
    model.counter = 0;

    model.$watch(
      (m) => m.someValue,
      () => {
        model.counter++;
      },
    );

    model.$watch(
      (m) => m.someValue,
      () => model.counter++,
    );

    expect(model.counter).toBe(0);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(2);
  });

  it("calls only the listeners registerred at the moment the watched value changes", async () => {
    model.someValue = "a";
    model.counter = 0;

    model.$watch(
      (m) => m.someValue,
      () => model.counter++,
    );
    expect(model.counter).toBe(0);

    model.someValue = "b";
    await wait();
    expect(model.counter).toBe(1);

    model.someValue = "b";
    model.$watch(
      (m) => m.someValue,
      () => {
        model.counter++;
      },
    );
    await wait();

    expect(model.counter).toBe(1);
  });

  it("correctly handles NaNs", async () => {
    model.counter = 0;
    model.$watch(
      function (model) {
        return model.number;
      },
      function (newValue, oldValue, model) {
        model.counter++;
      },
    );
    model.number = 0 / 0;
    await wait();
    expect(model.number).toBeNaN();
    expect(model.counter).toBe(1);

    model.number = NaN;
    await wait();
    expect(model.number).toBeNaN();
    expect(model.counter).toBe(1);
  });

  it("calls listener with undefined old value the first time", async () => {
    var oldValueGiven;
    var newValueGiven;
    model.$watch(
      function (model) {
        return model.someValue;
      },
      function (newValue, oldValue, model) {
        newValueGiven = newValue;
        oldValueGiven = oldValue;
      },
    );
    model.someValue = 123;
    await wait();

    expect(oldValueGiven).toBe(undefined);
    expect(newValueGiven).toBe(123);
  });

  it("calls listener with new value and old value the first time if defined", async () => {
    var oldValueGiven;
    var newValueGiven;
    model.someValue = 123;

    model.$watch(
      function (model) {
        return model.someValue;
      },
      function (newValue, oldValue, model) {
        newValueGiven = newValue;
        oldValueGiven = oldValue;
      },
    );
    model.someValue = 321;
    await wait();

    expect(oldValueGiven).toBe(123);
    expect(newValueGiven).toBe(321);
  });

  it("calls listener with with the instance of a model as 3rd argument", async () => {
    var modelInstance;
    model.someValue = 123;

    model.$watch(
      function (model) {
        return model.someValue;
      },
      function (_1, _2, m) {
        modelInstance = m;
      },
    );
    model.someValue = 321;
    await wait();

    expect(modelInstance).toBeDefined();
    expect(modelInstance).toEqual(model);
  });

  it("triggers chained watchers in the same model change", async () => {
    model.$watch(
      (model) => model.nameUpper,
      function (newValue) {
        if (newValue) {
          model.initial = newValue.substring(0, 1) + ".";
        }
      },
    );
    model.$watch(
      (model) => model.name,
      function (newValue) {
        if (newValue) {
          model.nameUpper = newValue.toUpperCase();
        }
      },
    );
    model.name = "Jane";
    await wait(1);
    expect(model.initial).toBe("J.");

    model.name = "Bob";
    await wait(1);
    expect(model.initial).toBe("B.");
  });

  it("can register nested watches", async () => {
    model.counter = 0;
    model.aValue = "abc";
    model.$watch(
      (model) => model.aValue,
      () => {
        model.$watch(
          (model) => model.aValue,
          () => {
            model.counter++;
          },
        );
      },
    );
    model.aValue = "2";
    await wait(100);
    expect(model.counter).toBe(0);
    model.aValue = "3";
    await wait(100);
    expect(model.counter).toBe(1);
  });

  describe("watching objects", () => {
    it("can set watch functions that return nested properties", async () => {
      model.counter = 0;
      model.a = { someValue: 1 };
      model.$watch(
        (obj) => obj.a.someValue,
        () => {
          model.counter++;
        },
      );

      model.a.someValue = 2;
      await wait();
      expect(model.counter).toBe(1);

      model.a.someValue = 3;
      await wait();
      expect(model.counter).toBe(2);
    });

    it("calls the listener function when a nested value is created on an empty wrapper object", async () => {
      model.counter = 0;
      model.someValue = {};

      model.$watch(
        (obj) => obj.someValue.b,
        async () => {
          model.counter++;
        },
      );
      await wait();

      expect(model.counter).toBe(0);

      model.someValue = { b: 2 };
      await wait();

      expect(model.counter).toBe(1);
    });

    it("calls the listener function when a nested value is created on an undefined wrapper object", async () => {
      model.counter = 0;
      model.someValue = undefined;

      model.$watch(
        (obj) => obj.someValue.b,
        async () => {
          model.counter++;
        },
      );
      await wait();

      expect(model.counter).toBe(0);

      model.someValue = { b: 2 };
      await wait();

      expect(model.counter).toBe(1);
    });

    it("calls the listener function when a nested value is created from a wrapper object", async () => {
      model.someValue = { b: 1 };
      model.counter = 0;

      model.$watch(
        (obj) => obj.someValue.b,
        () => model.counter++,
      );
      await wait();

      expect(model.counter).toBe(0);

      model.someValue = { b: 2 };
      await wait();

      expect(model.counter).toBe(1);
      model.someValue = { c: 2 };
      await wait();

      expect(model.counter).toBe(2);

      model.someValue = { b: 2 };
      await wait();

      expect(model.counter).toBe(3);

      model.someValue = undefined;
      await wait();

      expect(model.counter).toBe(4);
    });

    it("calls the listener function when a deeply nested watched value changes", async () => {
      model.counter = 0;
      model.someValue = { b: { c: { d: 1 } } };

      model.$watch(
        (obj) => obj.someValue.b.c.d,
        function (newValue, oldValue, model) {
          model.counter++;
        },
      );
      await wait();

      expect(model.counter).toBe(0);

      model.someValue = { b: { c: { d: 2 } } };
      await wait();

      expect(model.counter).toBe(1);

      model.someValue.b.c.d = 3;
      await wait();

      expect(model.counter).toBe(2);
    });

    it("calls the listener function when a deeply nested watched value is initially undefined", async () => {
      model.counter = 0;
      model.someValue = { b: { c: undefined } };

      model.$watch(
        (obj) => obj.someValue.b.c.d,
        function (newValue, oldValue, model) {
          model.counter++;
        },
      );
      await wait();

      expect(model.counter).toBe(0);

      model.someValue = { b: { c: { d: 2 } } };
      await wait();

      expect(model.counter).toBe(1);

      model.someValue.b.c.d = 3;
      await wait();

      expect(model.counter).toBe(2);
    });
  });

  describe("watching arrays", () => {
    it("can watch arrays", async () => {
      model.aValue = [1, 2, 3];
      model.counter = 0;
      model.$watch(
        (model) => model.aValue,
        function (newValue, oldValue, m) {
          m.counter++;
        },
      );
      expect(model.counter).toBe(0);
      model.aValue.push(4);
      await wait(100);
      expect(model.counter).toBe(1);

      model.aValue.pop();
      await wait(100);
      expect(model.counter).toBe(2);
    });

    it("can pass the new value of the array as well as the previous value of the dropped item", async () => {
      model.aValue = [];
      var oldValueGiven;
      var newValueGiven;
      model.$watch(
        function (model) {
          return model.aValue;
        },
        function (newValue, oldValue) {
          newValueGiven = newValue;
          oldValueGiven = oldValue;
        },
      );

      model.aValue.push(4);
      await wait(100);
      expect(newValueGiven).toEqual([4]);
      expect(oldValueGiven).toBe(undefined);

      model.aValue.push(5);
      await wait(100);
      expect(newValueGiven).toEqual([4, 5]);
      expect(oldValueGiven).toBe(undefined);

      model.aValue[1] = 2;
      await wait(100);
      expect(newValueGiven).toEqual([4, 2]);
      expect(oldValueGiven).toBe(5);
    });

    it("can detect removal of items", async () => {
      model.aValue = [2, 3];
      var oldValueGiven;
      var newValueGiven;
      model.$watch(
        function (model) {
          return model.aValue;
        },
        function (newValue, oldValue) {
          newValueGiven = newValue;
          oldValueGiven = oldValue;
        },
      );

      model.aValue.pop();
      await wait(100);
      expect(newValueGiven).toEqual([2]);
      expect(oldValueGiven).toEqual([2, 3]);
    });
  });

  describe("inheritance", () => {
    it("can be constructed and used as an object", () => {
      const model = createModel();
      model.aProperty = 1;

      expect(model.aProperty).toBe(1);
    });

    it("inherits the parents properties", () => {
      model.aValue = [1, 2, 3];

      const child = model.$new();
      expect(child.aValue).toEqual([1, 2, 3]);

      model.bValue = 2;
      expect(child.bValue).toEqual(2);
    });

    it("does not cause a parent to inherit its properties", () => {
      const child = model.$new();
      child.aValue = [1, 2, 3];

      expect(model.aValue).toBeUndefined();
    });

    it("inherits the parents properties whenever they are defined", () => {
      const child = model.$new();

      model.aValue = [1, 2, 3];

      expect(child.aValue).toEqual([1, 2, 3]);
    });

    it("can be nested at any depth", () => {
      const a = model;
      const aa = a.$new();
      const aaa = aa.$new();
      const aab = aa.$new();
      const ab = a.$new();
      const abb = ab.$new();

      a.value = 1;

      expect(aa.value).toBe(1);
      expect(aaa.value).toBe(1);
      expect(aab.value).toBe(1);
      expect(ab.value).toBe(1);
      expect(abb.value).toBe(1);

      ab.anotherValue = 2;

      expect(abb.anotherValue).toBe(2);
      expect(aa.anotherValue).toBeUndefined();
      expect(aaa.anotherValue).toBeUndefined();
    });

    it("can manipulate a parent models property", () => {
      const child = model.$new();

      model.aValue = [1, 2, 3];
      child.aValue.push(4);

      expect(child.aValue).toEqual([1, 2, 3, 4]);
      expect(model.aValue).toEqual([1, 2, 3, 4]);
      expect(child.aValue).toEqual(model.aValue);
    });
  });

  describe("$id", () => {
    it("should have a unique id", () => {
      expect(model.$id < model.$new().$id).toBeTruthy();
    });
  });
});