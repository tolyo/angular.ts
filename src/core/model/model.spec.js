import { createModel } from "./model";

describe("Model", () => {
  it("can be instantiated with plain object", () => {
    const model = createModel({ a: 1, b: { c: 2 } });
    expect(model).toBeDefined();
    model.a = 2;
    expect(model.a).toEqual(2);
    model.d = 3;
    expect(model.d).toEqual(3);
  });

  it("can register listeners", () => {
    var listenerFn = jasmine.createSpy();
    const model = createModel();
    model.watch("any", listenerFn);
    model.sync();
    expect(listenerFn).toHaveBeenCalled();
  });

  it("calls the listener function when the watched value changes", function () {
    const model = createModel();
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
    const model = createModel();
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
  });

  it("calls the listener function when a deeply nested watched value changes", function () {
    const model = createModel();
    model.counter = 0;
    model.watch("someValue.b.c.d", function (newValue, oldValue, model) {
      model.counter++;
    });
    expect(model.counter).toBe(0);
    model.someValue = { b: { c: { d: 1 } } };
    model.someValue.b.c.d = 2;
    expect(model.counter).toBe(1);
  });
});
