import { createModel } from "./model";

describe("Model", () => {
  let model;
  beforeEach(() => {
    model = createModel();
  });

  it("can be instantiated with plain object", () => {
    model = createModel({ a: 1, b: { c: 2 } });
    expect(model).toBeDefined();
    model.a = 2;
    expect(model.a).toEqual(2);
    model.d = 3;
    expect(model.d).toEqual(3);
  });

  it("can register listeners", () => {
    var listenerFn = jasmine.createSpy();

    model.watch("any", listenerFn);
    model.sync();
    expect(listenerFn).toHaveBeenCalled();
  });

  it("calls the listener function when the watched value changes", function () {
    model.someValue = "a";
    model.counter = 0;

    model.watch("someValue", function (newValue, oldValue, model) {
      model.counter++;
    });

    expect(model.counter).toBe(0);

    model.someValue = "b";
    expect(model.counter).toBe(1);

    model.someValue = "b";
    expect(model.counter).toBe(1);

    model.someValue = "c";
    expect(model.counter).toBe(2);
  });

  it("calls the listener function when a nested watched value changes", function () {
    model.someValue = { b: 1 };
    model.counter = 0;

    model.watch("someValue.b", function (newValue, oldValue, model) {
      model.counter++;
    });

    expect(model.counter).toBe(0);

    model.someValue.b = 2;
    expect(model.counter).toBe(1);

    model.someValue.b = 2;
    expect(model.counter).toBe(1);

    model.someValue.b = 3;
    expect(model.counter).toBe(2);

    model.someValue = null;
    expect(model.counter).toBe(2);

    model.someValue = { b: 3 };
    expect(model.counter).toBe(2);
  });

  it("calls the listener function when a deeply nested watched value changes", function () {
    model.counter = 0;
    model.watch("someValue.b.c.d", function (newValue, oldValue, model) {
      model.counter++;
    });

    expect(model.counter).toBe(0);

    model.someValue = { b: { c: { d: 1 } } };
    expect(model.counter).toBe(0);

    model.someValue.b.c.d = 2;
    expect(model.counter).toBe(1);

    model.someValue.b.c.d = 2;
    expect(model.counter).toBe(1);

    model.someValue.b.c.d = 3;
    expect(model.counter).toBe(2);
  });

  it("calls listener with new value as old value the first time", function () {
    let oldValueGiven;
    model.watch("someValue", function (newValue, oldValue, model) {
      oldValueGiven = oldValue;
    });
    model.someValue = 123;
    expect(oldValueGiven).toBe(123);

    model.someValue = 124;
    expect(oldValueGiven).toBe(123);

    model.someValue = 125;
    expect(oldValueGiven).toBe(124);
  });

  it("triggers chained watchers in the same digest", function () {
    model.watch("nameUpper", function (newValue) {
      if (newValue) {
        model.initial = newValue.substring(0, 1) + ".";
      }
    });
    model.watch("name", function (newValue) {
      if (newValue) {
        model.nameUpper = newValue.toUpperCase();
      }
    });
    model.name = "Jane";
    expect(model.initial).toBe("J.");
    model.name = "Bob";
    expect(model.initial).toBe("B.");
  });
});
