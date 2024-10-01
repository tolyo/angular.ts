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
    var watchFn = function () {
      return "wat";
    };
    var listenerFn = jasmine.createSpy();
    const model = createModel();
    debugger;
    model.watch(watchFn, listenerFn);
    model.sync();
    expect(listenerFn).toHaveBeenCalled();
  });
});
