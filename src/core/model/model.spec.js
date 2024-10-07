import { createModel } from "./model";

describe("Model", () => {
  let model;
  beforeEach(() => {
    model = createModel();
  });

  it("can be instantiated with plain object", () => {
    model = createModel({ a: 1, b: { c: 2 } });
    expect(model).toBeDefined();
    expect(model.a).toEqual(1);
    expect(model.b.c).toEqual(2);
    model.a = 2;
    expect(model.a).toEqual(2);
    model.d = 3;
    expect(model.d).toEqual(3);
  });

  it("can register listeners", () => {
    var listenerFn = jasmine.createSpy();
    model.$watch(() => {}, listenerFn);
    model.$digest();
    expect(listenerFn).toHaveBeenCalled();
  });

  it("calls the watch function with the model as the argument", () => {
    var watchFn = jasmine.createSpy();
    var listenerFn = () => {};
    model.$watch(watchFn, listenerFn);
    model.$digest();
    expect(watchFn).toHaveBeenCalledWith(model);
  });

  it("calls the listener function when the watched value changes", () => {
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
    expect(model.counter).toBe(1);

    model.someValue = "b";
    expect(model.counter).toBe(1);

    model.someValue = "c";
    expect(model.counter).toBe(2);
  });

  it("calls listener with new value as old value the first time", () => {
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

    expect(oldValueGiven).toBe(123);
    expect(newValueGiven).toBe(123);
  });

  it("calls listener with new value and old value the first time if defined", () => {
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

    expect(oldValueGiven).toBe(123);
    expect(newValueGiven).toBe(321);
  });

  it("calls listener with with the instance of a model as 3rd argument", () => {
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

    expect(modelInstance).toBeDefined();
    expect(modelInstance).toEqual(model);
  });

  // it("can set watch functions that return properties", () => {
  //   model.counter = 0;
  //   model.$watch(
  //     (obj) => obj.someValue,
  //     () => {
  //       model.counter++;
  //     },
  //   );
  //   model.someValue = 1;
  //   expect(model.counter).toBe(1);
  // });

  // it("can set watch functions that return nested properties", () => {
  //   model.counter = 0;
  //   model.a = { someValue: 1 };
  //   model.$watch(
  //     (obj) => obj.a.someValue,
  //     () => {
  //       model.counter++;
  //     },
  //   );

  //   model.a.someValue = 2;
  //   expect(model.counter).toBe(1);

  //   model.a.someValue = 3;
  //   expect(model.counter).toBe(2);
  // });

  // it("calls the listener function when the watched value changes", () => {
  //   model.someValue = "a";
  //   model.counter = 0;

  //   model.$watch("someValue", () => {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);

  //   model.someValue = "b";
  //   expect(model.counter).toBe(1);

  //   model.someValue = "b";
  //   expect(model.counter).toBe(1);

  //   model.someValue = "c";
  //   expect(model.counter).toBe(2);
  // });

  // it("calls the listener function when the watched value is initialized", () => {
  //   model.counter = 0;

  //   model.$watch("someValue", () => {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);

  //   model.someValue = "b";
  //   expect(model.counter).toBe(1);
  // });

  // it("calls the listener function when a nested watched value changes", () => {
  //   model.someValue = { b: 1 };
  //   model.counter = 0;

  //   model.$watch("someValue.b", () => {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);

  //   model.someValue.b = 2;
  //   expect(model.counter).toBe(1);

  //   model.someValue.b = 2;
  //   expect(model.counter).toBe(1);

  //   model.someValue.b = 3;
  //   expect(model.counter).toBe(2);

  //   model.someValue = null;
  //   expect(model.counter).toBe(2);

  //   model.someValue = { b: 3 };
  //   expect(model.counter).toBe(2);
  // });

  // it("calls the listener function when a nested value is created from a wrapper object", () => {
  //   model.someValue = { b: 1 };
  //   model.counter = 0;

  //   model.$watch("someValue.b", () => {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);
  //   model.someValue = { b: 2 };
  //   expect(model.counter).toBe(1);
  // });

  // it("calls the listener function when a nested value is created on an empty wrapper object", () => {
  //   model.counter = 0;
  //   model.someValue = {};

  //   model.$watch("someValue.b", () => {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);
  //   model.someValue = { b: 2 };
  //   expect(model.counter).toBe(1);
  // });

  // it("calls the listener function when a nested value is created on an undefined wrapper object", () => {
  //   model.counter = 0;
  //   model.$watch("someValue.b", () => {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);
  //   model.someValue = { b: 2 };
  //   expect(model.counter).toBe(1);
  // });

  // it("calls the listener function when a deeply nested watched value changes", () => {
  //   model.counter = 0;
  //   model.$watch("someValue.b.c.d", function (newValue, oldValue, model) {
  //     model.counter++;
  //   });

  //   expect(model.counter).toBe(0);

  //   model.someValue = { b: { c: { d: 1 } } };
  //   expect(model.counter).toBe(1);

  //   model.someValue.b.c.d = 2;
  //   expect(model.counter).toBe(2);

  //   model.someValue.b.c.d = 2;
  //   expect(model.counter).toBe(2);

  //   model.someValue.b.c.d = 3;
  //   expect(model.counter).toBe(3);
  // });

  // it("calls listener with new value as old value the first time", () => {
  //   let oldValueGiven;
  //   model.$watch("someValue", function (newValue, oldValue, model) {
  //     oldValueGiven = oldValue;
  //   });
  //   model.someValue = 123;
  //   expect(oldValueGiven).toBe(123);

  //   model.someValue = 124;
  //   expect(oldValueGiven).toBe(123);

  //   model.someValue = 125;
  //   expect(oldValueGiven).toBe(124);
  // });

  // it("calls multiple listeners when registered on same property", () => {
  //   model.counter = 0;
  //   model.$watch("someValue", () => {
  //     model.counter++;
  //   });
  //   model.$watch("someValue", () => {
  //     model.counter++;
  //   });
  //   model.someValue = 123;
  //   expect(model.counter).toBe(2);
  // });

  // it("triggers chained watchers in the same digest", () => {
  //   model.$watch("nameUpper", function (newValue) {
  //     if (newValue) {
  //       model.initial = newValue.substring(0, 1) + ".";
  //     }
  //   });
  //   model.$watch("name", function (newValue) {
  //     if (newValue) {
  //       model.nameUpper = newValue.toUpperCase();
  //     }
  //   });
  //   model.name = "Jane";
  //   expect(model.initial).toBe("J.");
  //   model.name = "Bob";
  //   expect(model.initial).toBe("B.");
  // });

  // it("calls the listener function only on the designated property even when value name is shared", () => {
  //   let counter = 0;
  //   let previousValue;
  //   model.$watch("someValue.b.c.d", function (_, oldValue) {
  //     counter++;
  //     previousValue = oldValue;
  //   });

  //   expect(counter).toBe(0);

  //   model.someValue = {
  //     b: { c: { d: 1 } },
  //     d: 2,
  //   };
  //   expect(counter).toBe(1);

  //   model.someValue.b.c.d = 3;
  //   expect(previousValue).toBe(1);
  //   expect(counter).toBe(1);

  //   model.someValue.d = 4;
  //   expect(previousValue).toBe(2);
  //   expect(counter).toBe(2);

  //   model.someValue.b.c.d = 1;
  //   expect(previousValue).toBe(3);
  //   expect(counter).toBe(3);

  //   model.someValue.d = 2;
  //   expect(previousValue).toBe(4);
  //   expect(counter).toBe(4);
  // });

  // it("throws a RangeError on cyclical model updates", () => {
  //   model.counterA = 0;
  //   model.counterB = 0;
  //   model.$watch("counterA", () => {
  //     model.counterB++;
  //   });
  //   model.$watch("counterB", () => {
  //     model.counterA++;
  //   });
  //   expect(() => {
  //     model.counterA = 1;
  //   }).toThrowError(RangeError);
  // });

  // it("does not end digest so that new watches are not run", () => {
  //   model.counter = 0;
  //   model.$watch("aValue", () => {
  //     model.$watch("aValue", () => {
  //       model.counter++;
  //     });
  //   });
  //   model.aValue = "abc";
  //   expect(model.counter).toBe(1);
  // });
});
